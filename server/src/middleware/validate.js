const ApiError = require('../utils/ApiError');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body || {},
      query: req.query || {},
      params: req.params || {},
    });
    if (!result.success) {
      return next(new ApiError(400, 'VALIDATION_ERROR', 'Invalid request', result.error.flatten()));
    }
    req.validated = result.data;
    next();
  };
}

module.exports = validate;
