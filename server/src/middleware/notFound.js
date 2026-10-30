function notFound(req, res) {
  res.status(404).json({
    success: false,
    data: null,
    error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.originalUrl}` },
    meta: { requestId: req.id || null },
  });
}

module.exports = notFound;
