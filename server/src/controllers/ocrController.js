const Certificate = require('../models/Certificate');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const certificateService = require('../services/certificateService');
const { assertCertificateAccess } = require('../middleware/ownership');

exports.runOcr = asyncHandler(async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  const apply = req.body && (req.body.apply === true || req.body.apply === 'true');
  const result = await certificateService.runOcr(cert, { apply });
  ok(res, {
    suggestions: result.suggestions,
    textLength: result.textLength,
    trustScore: result.trust.score,
    trustReasons: result.trust.reasons,
  });
});
