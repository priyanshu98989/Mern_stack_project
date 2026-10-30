const Certificate = require('../models/Certificate');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const aiService = require('../services/aiService');
const certificateService = require('../services/certificateService');
const env = require('../config/env');
const { assertCertificateAccess, assertStudentAccess } = require('../middleware/ownership');
const auditService = require('../services/auditService');

async function guard(user, { verifier = false } = {}) {
  if (!(await aiService.aiEnabled()))
    throw new ApiError(503, 'FEATURE_DISABLED', 'AI features are disabled');
  const used = await aiService.usageToday(user.id);
  if (used >= env.AI_DAILY_LIMIT)
    throw new ApiError(
      429,
      'AI_DAILY_LIMIT',
      `AI daily limit of ${env.AI_DAILY_LIMIT} requests reached`
    );
  if (verifier && !['faculty', 'hod', 'admin'].includes(user.role))
    throw new ApiError(403, 'FORBIDDEN', 'Verifier access required');
}

exports.analyze = asyncHandler(async (req, res) => {
  await guard(req.user);
  const cert = await Certificate.findById(req.params.id);
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  if (cert.status === 'APPROVED')
    throw new ApiError(400, 'INVALID_STATE', 'Approved certificates cannot be re-analysed');

  const fileHash = cert.proof ? cert.proof.hash : '';
  if (cert.aiAnalysis && cert.aiAnalysis.fileHash === fileHash && cert.aiAnalysis.data) {
    return ok(res, { cached: true, source: cert.aiAnalysis.source, data: cert.aiAnalysis.data });
  }

  if (!cert.ocrSuggestions || !cert.ocrSuggestions.textPreview) {
    const result = await certificateService.runOcr(cert, { apply: false });
    if (!result.textLength)
      return ok(res, { cached: false, source: 'none', data: null, reason: 'NO_TEXT' });
  }
  const text = cert.ocrSuggestions.textPreview || '';
  const result = await aiService.analyzeCertificateText(text, req.user.id);
  cert.aiAnalysis = {
    fileHash,
    source: result.source,
    data: result.data,
    at: new Date(),
    reason: result.reason || '',
  };
  cert.ocrSuggestions = { ...(cert.ocrSuggestions || {}), aiAnalysis: cert.aiAnalysis };
  cert.version += 1;
  await cert.save();
  auditService.log({
    actor: req.user,
    action: 'ai.certificate_analyzed',
    resource: 'Certificate',
    resourceId: cert._id,
    req,
  });
  ok(res, {
    cached: false,
    source: result.source,
    data: result.data,
    reason: result.reason || null,
  });
});

exports.semanticDuplicates = asyncHandler(async (req, res) => {
  await guard(req.user);
  const { title, candidates } = req.validated.body;
  let list = candidates;
  if (!list) {
    const certs = await Certificate.find({ student: req.user.id })
      .select('title')
      .limit(200)
      .lean();
    list = certs.map((c) => ({ id: String(c._id), title: c.title }));
  }
  ok(res, { duplicates: aiService.semanticDuplicates(title, list) });
});

exports.skillGap = asyncHandler(async (req, res) => {
  await guard(req.user);
  const studentId = req.validated.body.studentId || req.user.id;
  await assertStudentAccess(req.user, studentId);
  const certs = await Certificate.find({ student: studentId, status: 'APPROVED' })
    .select('skillTags')
    .lean();
  const skills = [...new Set(certs.flatMap((c) => c.skillTags || []))];
  ok(res, aiService.skillGap(skills, req.validated.body.path));
});

exports.verifierCopilot = asyncHandler(async (req, res) => {
  await guard(req.user, { verifier: true });
  const cert = await Certificate.findById(req.params.id);
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  const explanation = await aiService.verifierCopilot(cert, req.user.id);
  auditService.log({
    actor: req.user,
    action: 'ai.verifier_copilot',
    resource: 'Certificate',
    resourceId: cert._id,
    req,
  });
  ok(res, { explanation });
});

exports.apply = asyncHandler(async (req, res) => {
  const cert = await Certificate.findById(req.params.id);
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  if (String(cert.student._id || cert.student) !== String(req.user.id))
    throw new ApiError(403, 'FORBIDDEN', 'Only the student can apply AI suggestions');
  if (!['DRAFT', 'NEEDS_CHANGES', 'REJECTED'].includes(cert.status))
    throw new ApiError(400, 'INVALID_STATE', 'Certificate cannot be edited');
  const source =
    (cert.aiAnalysis && cert.aiAnalysis.data) || (cert.ocrSuggestions && cert.ocrSuggestions) || {};
  const allowed = req.validated.body.fields;
  for (const field of allowed) {
    if (source[field] !== undefined && source[field] !== null && source[field] !== '') {
      if (field === 'skillTags' && Array.isArray(source[field])) {
        cert.skillTags = [...new Set([...(cert.skillTags || []), ...source[field]])];
      } else {
        cert[field] = source[field];
      }
    }
  }
  cert.version += 1;
  await cert.save();
  auditService.log({
    actor: req.user,
    action: 'ai.suggestions_applied',
    resource: 'Certificate',
    resourceId: cert._id,
    diff: { after: { fields: allowed } },
    req,
  });
  ok(res, { certificate: cert });
});
