const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function issueCsrfToken(res) {
  const token = crypto.randomBytes(24).toString('hex');
  res.cookie('csrfToken', token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: '/',
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
  return token;
}

/**
 * Double-submit CSRF check for cookie-based endpoints (refresh/logout).
 * The client reads the non-httpOnly csrfToken cookie and sends it back as a header.
 */
function csrfProtect(req, res, next) {
  if (env.isTest || SAFE_METHODS.has(req.method)) return next();
  const cookieToken = req.cookies && req.cookies.csrfToken;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(new ApiError(403, 'CSRF_FAILED', 'CSRF validation failed'));
  }
  next();
}

module.exports = { issueCsrfToken, csrfProtect };
