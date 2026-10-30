const crypto = require('crypto');
const User = require('../models/User');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/authService');
const { sendEmail } = require('../services/emailService');
const { issueCsrfToken } = require('../middleware/csrf');
const settingsService = require('../services/settingsService');
const auditService = require('../services/auditService');
const { getUserCredits } = require('../services/creditService');

function publicUser(user) {
  return user.toSafeJSON
    ? user.toSafeJSON()
    : {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        batch: user.batch,
        status: user.status,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        notificationPrefs: user.notificationPrefs,
      };
}

function audit(req, action, resourceId, diff) {
  auditService.log({
    actor: req.user || null,
    action,
    resource: 'User',
    resourceId,
    diff,
    req,
  });
}

function makeEmailToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: crypto.createHash('sha256').update(raw).digest('hex') };
}

async function sendVerificationEmail(user, token) {
  const url = `${env.CLIENT_URL}/verify-email/${token}`;
  await sendEmail(
    user.email,
    'Verify your CertTrack email',
    `Verify your email: ${url}\n\nThis link expires in 24 hours.`,
    `<p>Welcome to CertTrack.</p><p><a href="${url}">Verify your email</a></p><p>This link expires in 24 hours.</p>`
  );
}

exports.csrf = asyncHandler(async (req, res) => {
  const token = issueCsrfToken(res);
  ok(res, { csrfToken: token });
});

exports.register = asyncHandler(async (req, res) => {
  const allow = await settingsService.get('allowSelfRegister', true);
  if (!allow) throw new ApiError(403, 'REGISTRATION_DISABLED', 'Self-registration is disabled');
  const { name, email, password, department, batch } = req.validated.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'EMAIL_EXISTS', 'Email is already registered');

  const verify = makeEmailToken();
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    department: department || '',
    batch: batch || '',
    role: 'student',
    emailVerified: false,
    emailVerifyToken: verify.hash,
    emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await sendVerificationEmail(user, verify.raw).catch(() => {});
  audit(req, 'auth.register', String(user._id), { email: user.email });
  created(res, { user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, twoFactorToken } = req.validated.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+password +twoFactorSecret +failedLoginAttempts'
  );
  if (!user) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  if (user.status !== 'active')
    throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is not active');
  if (user.isLocked())
    throw new ApiError(423, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.');

  const match = await user.comparePassword(password);
  if (!match) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= env.MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + env.LOCKOUT_MINUTES * 60 * 1000);
      user.failedLoginAttempts = 0;
    }
    await user.save();
    audit(req, 'auth.login_failed', String(user._id), { email: user.email });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  if (user.twoFactorEnabled) {
    if (!twoFactorToken)
      throw new ApiError(401, 'TWO_FACTOR_REQUIRED', 'Enter your authenticator code');
    if (!authService.verifyTwoFactorToken(user.twoFactorSecret, twoFactorToken)) {
      throw new ApiError(401, 'INVALID_2FA', 'Invalid authenticator code');
    }
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  user.lastLoginIp = req.ip || '';
  await user.save();

  const { accessToken, refreshToken } = await authService.issueTokens(user, req);
  authService.setRefreshCookie(res, refreshToken);
  issueCsrfToken(res);
  audit(req, 'auth.login', String(user._id), { email: user.email });
  ok(res, { accessToken, user: publicUser(user) });
});

exports.refresh = asyncHandler(async (req, res) => {
  const raw = req.cookies && req.cookies.refreshToken;
  try {
    const result = await authService.rotateRefreshToken(raw, req);
    authService.setRefreshCookie(res, result.refreshToken);
    issueCsrfToken(res);
    ok(res, {
      accessToken: result.accessToken,
      user: publicUser(result.user),
    });
  } catch (err) {
    authService.clearRefreshCookie(res);
    throw err;
  }
});

exports.logout = asyncHandler(async (req, res) => {
  const raw = req.cookies && req.cookies.refreshToken;
  await authService.revokeRefreshToken(raw);
  authService.clearRefreshCookie(res);
  if (req.user) audit(req, 'auth.logout', req.user.id, null);
  ok(res, { message: 'Logged out' });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.validated.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+passwordResetToken +passwordResetExpires'
  );
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();
    const url = `${env.CLIENT_URL}/reset-password/${token}`;
    await sendEmail(
      user.email,
      'Reset your CertTrack password',
      `Reset your password: ${url}\n\nThis link expires in one hour. If you did not request it, ignore this email.`,
      `<p><a href="${url}">Reset your password</a></p><p>This link expires in one hour.</p>`
    ).catch(() => {});
    audit(req, 'auth.forgot_password', String(user._id), { email: user.email });
  }
  ok(res, { message: 'If the email exists, a reset link has been sent' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.validated.params;
  const { password } = req.validated.body;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');
  if (!user) throw new ApiError(400, 'INVALID_TOKEN', 'Reset link is invalid or expired');
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  await authService.revokeAllForUser(user._id);
  authService.clearRefreshCookie(res);
  audit(req, 'auth.reset_password', String(user._id), null);
  ok(res, { message: 'Password reset successful. Please sign in again.' });
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const token = req.params.token;
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    emailVerifyToken: hashed,
    emailVerifyExpires: { $gt: new Date() },
  }).select('+emailVerifyToken +emailVerifyExpires');
  if (!user) throw new ApiError(400, 'INVALID_TOKEN', 'Verification link is invalid or expired');
  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();
  audit(req, 'auth.verify_email', String(user._id), null);
  ok(res, { message: 'Email verified successfully' });
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.validated.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+emailVerifyToken +emailVerifyExpires'
  );
  if (user && !user.emailVerified) {
    const verify = makeEmailToken();
    user.emailVerifyToken = verify.hash;
    user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    await sendVerificationEmail(user, verify.raw).catch(() => {});
  }
  ok(res, { message: 'If the email needs verification, a new link has been sent' });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.validated.body;
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const match = await user.comparePassword(currentPassword);
  if (!match) throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  user.password = newPassword;
  await user.save();
  await authService.revokeAllForUser(user._id);
  authService.clearRefreshCookie(res);
  audit(req, 'auth.change_password', String(user._id), null);
  ok(res, { message: 'Password changed. Please sign in again.' });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const credits = await getUserCredits(user._id);
  ok(res, { user: { ...publicUser(user), credits } });
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const body = req.validated.body;
  if (body.name !== undefined) user.name = body.name;
  if (body.phone !== undefined) user.phone = body.phone;
  if (body.profilePhoto !== undefined) user.profilePhoto = body.profilePhoto;
  if (body.department !== undefined && user.role !== 'student') user.department = body.department;
  if (body.batch !== undefined && user.role !== 'student') user.batch = body.batch;
  if (body.notificationPrefs !== undefined) {
    user.notificationPrefs = { ...user.notificationPrefs.toObject?.(), ...body.notificationPrefs };
  }
  await user.save();
  audit(req, 'user.profile_updated', String(user._id), { fields: Object.keys(body) });
  ok(res, { user: publicUser(user) });
});

exports.setupTwoFactor = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+password');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const match = await user.comparePassword(req.validated.body.currentPassword);
  if (!match) throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect');
  if (user.twoFactorEnabled)
    throw new ApiError(
      400,
      'TWO_FACTOR_ALREADY_ENABLED',
      'Two-factor authentication is already enabled'
    );
  const { secret, otpauth } = authService.generateTwoFactorSecret(user);
  ok(res, { secret, otpauth });
});

exports.enableTwoFactor = asyncHandler(async (req, res) => {
  const { secret, token } = req.validated.body;
  await authService.enableTwoFactor(req.user.id, secret, token);
  await authService.revokeRefreshToken(req.cookies && req.cookies.refreshToken);
  authService.clearRefreshCookie(res);
  audit(req, 'auth.2fa_enabled', req.user.id, null);
  ok(res, { message: 'Two-factor authentication enabled. Please sign in again.' });
});

exports.disableTwoFactor = asyncHandler(async (req, res) => {
  await authService.disableTwoFactor(req.user.id, req.validated.body.token);
  audit(req, 'auth.2fa_disabled', req.user.id, null);
  ok(res, { message: 'Two-factor authentication disabled' });
});

exports.sessions = asyncHandler(async (req, res) => {
  const items = await authService.listSessions(req.user.id);
  ok(res, { items });
});

exports.revokeSession = asyncHandler(async (req, res) => {
  await authService.revokeSession(req.user.id, req.params.id);
  audit(req, 'auth.session_revoked', req.user.id, { sessionId: req.params.id });
  ok(res, { message: 'Session revoked' });
});

exports.googleStart = asyncHandler(async (req, res) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new ApiError(503, 'GOOGLE_NOT_CONFIGURED', 'Google sign-in is not configured');
  }
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauthState', state, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: 'lax',
    path: `${env.API_PREFIX}/auth/google`,
    maxAge: 10 * 60 * 1000,
  });
  res.redirect(authService.googleAuthUrl(state));
});

exports.googleCallback = asyncHandler(async (req, res) => {
  const fail = (code) =>
    res.redirect(`${env.CLIENT_URL}/login?oauth=error&code=${encodeURIComponent(code)}`);
  try {
    const { code, state } = req.query;
    const expected = req.cookies && req.cookies.oauthState;
    res.clearCookie('oauthState', { path: `${env.API_PREFIX}/auth/google` });
    if (!code || !state || !expected || state !== expected) return fail('INVALID_STATE');

    const profile = await authService.exchangeGoogleCode(code);
    if (!profile.email || profile.email_verified === false) return fail('EMAIL_NOT_VERIFIED');
    const email = String(profile.email).toLowerCase();
    if (env.GOOGLE_ALLOWED_DOMAIN && !email.endsWith(`@${env.GOOGLE_ALLOWED_DOMAIN}`))
      return fail('DOMAIN_NOT_ALLOWED');

    let user = await User.findOne({ $or: [{ googleId: profile.sub }, { email }] });
    if (!user) {
      const allow = await settingsService.get('allowSelfRegister', true);
      if (!allow) return fail('REGISTRATION_DISABLED');
      user = await User.create({
        name: profile.name || email.split('@')[0],
        email,
        googleId: profile.sub,
        role: 'student',
        emailVerified: true,
        profilePhoto: profile.picture || '',
      });
    } else {
      if (user.status !== 'active') return fail('ACCOUNT_INACTIVE');
      if (!user.googleId) user.googleId = profile.sub;
      if (!user.profilePhoto && profile.picture) user.profilePhoto = profile.picture;
      if (!user.emailVerified) user.emailVerified = true;
      await user.save();
    }

    const { refreshToken } = await authService.issueTokens(user, req);
    authService.setRefreshCookie(res, refreshToken);
    issueCsrfToken(res);
    audit(req, 'auth.google_login', String(user._id), { email });
    return res.redirect(`${env.CLIENT_URL}/auth/google/complete`);
  } catch (err) {
    return fail(err.code || 'GOOGLE_AUTH_FAILED');
  }
});
