const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function resolveUser(token) {
  if (!token) return null;
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  const user = await User.findById(payload.id).select(
    '-password -twoFactorSecret -emailVerifyToken -passwordResetToken'
  );
  if (!user || user.status !== 'active') return null;
  return user;
}

async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Missing access token');
    const user = await resolveUser(token);
    if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or inactive account');
    req.user = {
      id: String(user._id),
      role: user.role,
      department: user.department,
      email: user.email,
    };
    req.userDoc = user;
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}

async function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
    if (token) {
      const user = await resolveUser(token);
      if (user) {
        req.user = {
          id: String(user._id),
          role: user.role,
          department: user.department,
          email: user.email,
        };
        req.userDoc = user;
      }
    }
  } catch (e) {
    // ignore
  }
  next();
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'UNAUTHORIZED', 'Not authenticated'));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }
    next();
  };
}

function requireVerified(req, res, next) {
  if (!req.userDoc || !req.userDoc.emailVerified) {
    return next(new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email first'));
  }
  next();
}

module.exports = { protect, optionalAuth, authorize, requireVerified };
