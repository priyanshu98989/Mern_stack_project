const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const Session = require('../models/Session');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

function signAccess(user, sessionId) {
  return jwt.sign(
    { id: user._id || user.id, role: user.role, sid: sessionId || undefined },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL,
      issuer: 'certtrack',
      audience: 'certtrack-client',
    }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newFamily() {
  return crypto.randomUUID();
}

function parseDevice(userAgent = '') {
  const ua = String(userAgent);
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Unknown browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Unknown OS';
  return `${browser} on ${os}`;
}

async function startSession(user, req, family) {
  const fam = family || newFamily();
  const session = await Session.create({
    user: user._id || user.id,
    family: fam,
    device: parseDevice(req.get('user-agent')),
    ip: req.ip || '',
    userAgent: req.get('user-agent') || '',
    lastActive: new Date(),
  });
  return session;
}

async function issueRefreshToken(user, req, family, sessionId) {
  const raw = crypto.randomBytes(40).toString('hex');
  const hash = hashToken(raw);
  const fam = family || newFamily();
  await RefreshToken.create({
    user: user._id || user.id,
    session: sessionId || null,
    tokenHash: hash,
    family: fam,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  return { raw, family: fam, hash };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: `${env.API_PREFIX}/auth`,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function setRefreshCookie(res, raw) {
  res.cookie('refreshToken', raw, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: `${env.API_PREFIX}/auth`,
  });
}

async function issueTokens(user, req) {
  const session = await startSession(user, req);
  const { raw } = await issueRefreshToken(user, req, session.family, session._id);
  return { accessToken: signAccess(user, session._id), refreshToken: raw, session };
}

async function rotateRefreshToken(rawToken, req) {
  if (!rawToken) throw new ApiError(401, 'MISSING_REFRESH', 'Refresh token is missing');
  const hash = hashToken(rawToken);
  const doc = await RefreshToken.findOne({ tokenHash: hash });
  if (!doc) throw new ApiError(401, 'INVALID_REFRESH', 'Refresh token is invalid');
  if (doc.revoked) {
    await RefreshToken.updateMany({ family: doc.family }, { revoked: true, revokedAt: new Date() });
    await Session.updateMany({ family: doc.family }, { revoked: true });
    throw new ApiError(
      401,
      'REFRESH_REUSE',
      'Refresh token reuse detected; all sessions in this family were revoked'
    );
  }
  if (doc.expiresAt < new Date())
    throw new ApiError(401, 'EXPIRED_REFRESH', 'Refresh token expired');

  const user = await User.findById(doc.user);
  if (!user || user.status !== 'active')
    throw new ApiError(401, 'USER_INACTIVE', 'Account is not active');

  doc.revoked = true;
  doc.revokedAt = new Date();
  const { raw: newRaw } = await issueRefreshToken(user, req, doc.family, doc.session);
  doc.replacedBy = hashToken(newRaw);
  await doc.save();
  if (doc.session)
    await Session.updateOne({ _id: doc.session }, { lastActive: new Date(), ip: req.ip || '' });

  return {
    user,
    accessToken: signAccess(user, doc.session),
    refreshToken: newRaw,
    family: doc.family,
    sessionId: doc.session,
  };
}

async function revokeRefreshToken(rawToken) {
  if (!rawToken) return null;
  const hash = hashToken(rawToken);
  const doc = await RefreshToken.findOne({ tokenHash: hash });
  if (!doc) return null;
  doc.revoked = true;
  doc.revokedAt = new Date();
  await doc.save();
  if (doc.session) await Session.updateOne({ _id: doc.session }, { revoked: true });
  return doc;
}

async function revokeAllForUser(userId) {
  await Promise.all([
    RefreshToken.updateMany(
      { user: userId, revoked: false },
      { revoked: true, revokedAt: new Date() }
    ),
    Session.updateMany({ user: userId, revoked: false }, { revoked: true }),
  ]);
}

async function listSessions(userId, currentSessionId) {
  const rows = await Session.find({ user: userId, revoked: false }).sort({ lastActive: -1 }).lean();
  return rows.map((s) => ({
    id: String(s._id),
    device: s.device,
    ip: s.ip,
    lastActive: s.lastActive,
    createdAt: s.createdAt,
    current: currentSessionId ? String(s._id) === String(currentSessionId) : false,
  }));
}

async function revokeSession(userId, sessionId) {
  const session = await Session.findOne({ _id: sessionId, user: userId });
  if (!session) throw new ApiError(404, 'NOT_FOUND', 'Session not found');
  session.revoked = true;
  await session.save();
  await RefreshToken.updateMany(
    { session: session._id, revoked: false },
    { revoked: true, revokedAt: new Date() }
  );
}

function generateTwoFactorSecret(user) {
  const { authenticator } = require('otplib');
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(user.email, env.INSTITUTION_NAME, secret);
  return { secret, otpauth };
}

function verifyTwoFactorToken(secret, token) {
  if (!secret || !token) return false;
  try {
    const { authenticator } = require('otplib');
    authenticator.options = { window: 1 };
    return authenticator.check(String(token).replace(/\s+/g, ''), secret);
  } catch (err) {
    return false;
  }
}

async function enableTwoFactor(userId, secret, token) {
  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  if (!verifyTwoFactorToken(secret, token))
    throw new ApiError(400, 'INVALID_2FA', 'Invalid authenticator code');
  user.twoFactorSecret = secret;
  user.twoFactorEnabled = true;
  await user.save();
  await revokeAllForUser(user._id);
  return user;
}

async function disableTwoFactor(userId, token) {
  const user = await User.findById(userId).select('+twoFactorSecret');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  if (user.twoFactorEnabled && !verifyTwoFactorToken(user.twoFactorSecret, token)) {
    throw new ApiError(400, 'INVALID_2FA', 'Invalid authenticator code');
  }
  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await user.save();
  return user;
}

function googleAuthUrl(state) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeGoogleCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) throw new ApiError(401, 'GOOGLE_AUTH_FAILED', 'Google token exchange failed');
  const tokenJson = await tokenRes.json();
  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${tokenJson.access_token}` },
  });
  if (!infoRes.ok) throw new ApiError(401, 'GOOGLE_AUTH_FAILED', 'Google profile fetch failed');
  return infoRes.json();
}

module.exports = {
  signAccess,
  hashToken,
  startSession,
  issueRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllForUser,
  listSessions,
  revokeSession,
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  enableTwoFactor,
  disableTwoFactor,
  googleAuthUrl,
  exchangeGoogleCode,
};
