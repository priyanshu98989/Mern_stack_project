const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const certificateService = require('../services/certificateService');
const cryptoService = require('../services/cryptoService');

exports.verify = asyncHandler(async (req, res) => {
  const data = await certificateService.getPublicVerification(req.params.id);
  if (!data) throw new ApiError(404, 'NOT_FOUND', 'Verification ID not found');
  ok(res, data);
});

exports.jwks = asyncHandler(async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json(cryptoService.jwks());
});
