function withMeta(res, data, meta) {
  return res.json({ success: true, data, error: null, meta: meta || null });
}

function ok(res, data, meta) {
  return withMeta(res, data, meta);
}

function created(res, data, meta) {
  return res.status(201).json({ success: true, data, error: null, meta: meta || null });
}

function paginated(res, data, pagination) {
  return res.json({ success: true, data, error: null, meta: pagination || null });
}

function fail(res, statusCode, code, message, details) {
  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message, details: details || null },
    meta: null,
  });
}

module.exports = { ok, created, paginated, fail, withMeta };
