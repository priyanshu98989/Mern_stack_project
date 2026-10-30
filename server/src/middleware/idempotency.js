const crypto = require('crypto');
const IdempotencyKey = require('../models/IdempotencyKey');
const ApiError = require('../utils/ApiError');

function hashRequest(req) {
  return crypto
    .createHash('sha256')
    .update(
      JSON.stringify({ body: req.body || {}, params: req.params || {}, query: req.query || {} })
    )
    .digest('hex');
}

/**
 * Requires an Idempotency-Key header. Replays the stored JSON response for the
 * same user + route + key. Rejects the same key with a different payload.
 */
async function idempotency(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key) return next();
  if (key.length < 8 || key.length > 128) {
    return next(
      new ApiError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key must be 8-128 characters')
    );
  }

  const route = `${req.method} ${req.baseUrl}${req.path}`;
  const requestHash = hashRequest(req);

  try {
    const existing = await IdempotencyKey.findOne({ user: req.user.id, key, route });
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return next(
          new ApiError(
            409,
            'IDEMPOTENCY_CONFLICT',
            'This Idempotency-Key was used with a different payload'
          )
        );
      }
      if (existing.responseData) {
        return res.status(existing.statusCode || 200).json(existing.responseData);
      }
      return next(
        new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'This request is already in progress')
      );
    }

    await IdempotencyKey.create({
      user: req.user.id,
      key,
      route,
      requestHash,
      targetId: req.params.id || null,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 500) {
        IdempotencyKey.updateOne(
          { user: req.user.id, key, route },
          { responseData: body, statusCode: res.statusCode }
        ).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  } catch (err) {
    if (err && err.code === 11000) {
      return next(
        new ApiError(409, 'IDEMPOTENCY_IN_PROGRESS', 'This request is already in progress')
      );
    }
    next(err);
  }
}

module.exports = idempotency;
