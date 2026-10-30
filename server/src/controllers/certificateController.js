const Certificate = require('../models/Certificate');
const Platform = require('../models/Platform');
const ApiError = require('../utils/ApiError');
const { ok, created, paginated } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const certificateService = require('../services/certificateService');
const auditService = require('../services/auditService');
const { assertCertificateAccess } = require('../middleware/ownership');
const { removeFileQuietly } = require('../middleware/upload');

async function loadCertificate(req) {
  const cert = await Certificate.findOne({ _id: req.params.id, deletedAt: null }).populate(
    'student',
    'name email department batch'
  );
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  return cert;
}

exports.create = asyncHandler(async (req, res) => {
  const cert = await certificateService.createCertificate(req.user.id, req.validated.body);
  auditService.log({
    actor: req.user,
    action: 'certificate.created',
    resource: 'Certificate',
    resourceId: cert._id,
    diff: { after: { title: cert.title } },
    req,
  });
  created(res, { certificate: cert });
});

exports.list = asyncHandler(async (req, res) => {
  const { items, meta } = await certificateService.listCertificates(req.user, req.query);
  paginated(res, { items }, meta);
});

exports.getById = asyncHandler(async (req, res) => {
  const cert = await certificateService.getCertificate(req.params.id, req.user);
  ok(res, { certificate: cert });
});

exports.update = asyncHandler(async (req, res) => {
  if (!['student', 'admin'].includes(req.user.role)) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Only the owning student or an admin can edit a certificate'
    );
  }
  const cert = await loadCertificate(req);
  if (req.user.role === 'student' && String(cert.student._id || cert.student) !== req.user.id) {
    throw new ApiError(403, 'FORBIDDEN', 'Not allowed');
  }
  const { cert: updated, before } = await certificateService.updateCertificate(
    cert,
    req.validated.body
  );
  auditService.log({
    actor: req.user,
    action: 'certificate.updated',
    resource: 'Certificate',
    resourceId: updated._id,
    diff: {
      before: { title: before.title, status: before.status },
      after: { title: updated.title, status: updated.status },
    },
    req,
  });
  ok(res, { certificate: updated });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!['student', 'admin'].includes(req.user.role)) {
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Only the owning student or an admin can delete a certificate'
    );
  }
  const cert = await loadCertificate(req);
  if (String(cert.student._id || cert.student) !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Not allowed');
  }
  const file = certificateService.proofPath(cert);
  const result = await certificateService.removeCertificate(cert);
  if (!result.softDeleted && file) removeFileQuietly(file);
  auditService.log({
    actor: req.user,
    action: result.softDeleted ? 'certificate.archived' : 'certificate.deleted',
    resource: 'Certificate',
    resourceId: cert._id,
    diff: { before: { title: cert.title, status: cert.status } },
    req,
  });
  ok(res, { message: result.softDeleted ? 'Certificate archived' : 'Certificate deleted' });
});

exports.proof = asyncHandler(async (req, res) => {
  const cert = await loadCertificate(req);
  const full = certificateService.proofPath(cert);
  if (!full) throw new ApiError(404, 'NOT_FOUND', 'Proof document not found');
  res.setHeader('Content-Type', cert.proof.mimetype || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${String(cert.proof.filename || 'proof').replace(/["\\]/g, '')}"`
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(full);
});

exports.uploadProof = asyncHandler(async (req, res) => {
  const cert = await loadCertificate(req);
  if (String(cert.student._id || cert.student) !== req.user.id)
    throw new ApiError(403, 'FORBIDDEN', 'Not allowed');
  const previous = certificateService.proofPath(cert);
  const { cert: updated, trust } = await certificateService.attachProof(cert, req.file);
  if (previous && previous !== certificateService.proofPath(updated)) removeFileQuietly(previous);
  auditService.log({
    actor: req.user,
    action: 'certificate.proof_uploaded',
    resource: 'Certificate',
    resourceId: cert._id,
    req,
  });
  ok(res, {
    certificate: updated,
    trustScore: trust.score,
    duplicateFlags: trust.reasons,
    labels: trust.labels,
  });
});

exports.runOcr = asyncHandler(async (req, res) => {
  const cert = await loadCertificate(req);
  const apply = req.body && (req.body.apply === true || req.body.apply === 'true');
  const result = await certificateService.runOcr(cert, { apply });
  auditService.log({
    actor: req.user,
    action: 'certificate.ocr_run',
    resource: 'Certificate',
    resourceId: cert._id,
    req,
  });
  ok(res, {
    certificate: result.cert,
    suggestions: result.suggestions,
    textLength: result.textLength,
    trustScore: result.trust.score,
  });
});

exports.submit = asyncHandler(async (req, res) => {
  const cert = await loadCertificate(req);
  const result = await certificateService.submitCertificate(cert, req.user, req);
  auditService.log({
    actor: req.user,
    action: 'certificate.submitted',
    resource: 'Certificate',
    resourceId: cert._id,
    req,
  });
  ok(res, {
    certificate: result.cert,
    trustScore: result.trust.score,
    duplicateFlags: result.trust.reasons,
  });
});

exports.transition = asyncHandler(async (req, res) => {
  const cert = await loadCertificate(req);
  const result = await certificateService.transition(cert, req.user, req.validated.body, req);
  ok(res, { certificate: result.cert, credits: result.credits });
});

exports.history = asyncHandler(async (req, res) => {
  const items = await certificateService.getHistory(req.params.id, req.user);
  ok(res, { items });
});

exports.checkExternal = asyncHandler(async (req, res) => {
  const cert = await loadCertificate(req);
  if (!['faculty', 'hod', 'admin'].includes(req.user.role))
    throw new ApiError(403, 'FORBIDDEN', 'Not allowed');
  const externalVerification = await certificateService.checkExternalLink(cert, req.user);
  auditService.log({
    actor: req.user,
    action: 'certificate.external_checked',
    resource: 'Certificate',
    resourceId: cert._id,
    diff: { after: externalVerification },
    req,
  });
  ok(res, { externalVerification, certificate: cert });
});

exports.listPlatforms = asyncHandler(async (req, res) => {
  const items = await Platform.find({ active: true }).sort({ name: 1 }).lean();
  ok(res, { items });
});

exports.createPlatform = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const slug =
    body.slug ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const platform = await Platform.create({
    name: body.name,
    slug,
    website: body.website || '',
    verificationUrlTemplate: body.verificationUrlTemplate || '',
    domains: body.domains || [],
    active: body.active !== false,
    createdBy: req.user.id,
  });
  auditService.log({
    actor: req.user,
    action: 'platform.created',
    resource: 'Platform',
    resourceId: platform._id,
    req,
  });
  created(res, { platform });
});

exports.updatePlatform = asyncHandler(async (req, res) => {
  const platform = await Platform.findByIdAndUpdate(req.params.id, req.validated.body, {
    new: true,
    runValidators: true,
  });
  if (!platform) throw new ApiError(404, 'NOT_FOUND', 'Platform not found');
  auditService.log({
    actor: req.user,
    action: 'platform.updated',
    resource: 'Platform',
    resourceId: platform._id,
    req,
  });
  ok(res, { platform });
});
