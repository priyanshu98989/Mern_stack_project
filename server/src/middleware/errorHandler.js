const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

function send(res, req, status, code, message, details = null) {
  return res.status(status).json({
    success: false,
    data: null,
    error: { code, message, details },
    meta: { requestId: req.id || null },
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof ApiError) {
    if (err.statusCode >= 500) logger.error({ err, requestId: req.id }, 'api error');
    return send(res, req, err.statusCode, err.code, err.message, err.details);
  }

  if (err && err.name === 'ZodError') {
    return send(res, req, 400, 'VALIDATION_ERROR', 'Validation failed', err.issues || err.errors);
  }

  if (err && err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return send(res, req, 400, 'VALIDATION_ERROR', 'Validation failed', details);
  }

  if (err && err.name === 'CastError') {
    return send(res, req, 400, 'INVALID_ID', 'Invalid identifier');
  }

  if (err && err.code === 11000) {
    return send(res, req, 409, 'DUPLICATE_KEY', 'Duplicate value', err.keyValue || null);
  }

  if (err && err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
    return send(res, req, 400, 'UPLOAD_ERROR', message);
  }

  if (err && err.type === 'entity.too.large') {
    return send(res, req, 413, 'PAYLOAD_TOO_LARGE', 'Request body too large');
  }

  if (err && (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')) {
    return send(res, req, 401, 'UNAUTHORIZED', 'Invalid or expired token');
  }

  logger.error({ err, requestId: req.id }, 'unhandled error');
  return send(res, req, 500, 'INTERNAL_ERROR', 'Internal server error');
}

module.exports = errorHandler;
