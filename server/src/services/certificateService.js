const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Certificate = require('../models/Certificate');
const Platform = require('../models/Platform');
const StatusHistory = require('../models/StatusHistory');
const User = require('../models/User');
const FacultyAssignment = require('../models/FacultyAssignment');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { canActorTransition, requiresRemarks, isOverride } = require('../utils/stateMachine');
const {
  getScopedStudentIds,
  assertCertificateAccess,
  assertVerifier,
  canAccessCertificate,
} = require('../middleware/ownership');
const { computeTrust } = require('./fraudService');
const { extractText, suggestFromText, nameMatchesAccount } = require('./ocrService');
const { awardCredits, reverseCredits, computeCredits } = require('./creditService');
const { makeVerificationQr } = require('./qrService');
const cryptoService = require('./cryptoService');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const settingsService = require('./settingsService');
const { assertPublicHttpUrl } = require('../utils/urlSafety');

const EDITABLE = [
  'title',
  'platform',
  'platformName',
  'institute',
  'instructor',
  'durationWeeks',
  'durationHours',
  'startDate',
  'endDate',
  'grade',
  'score',
  'certificateId',
  'certificateUrl',
  'skillTags',
  'semester',
];

function parseDate(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, 'INVALID_DATE', 'Invalid date supplied');
  return d;
}

function normalizeSkillTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [
    ...new Set(
      tags
        .map((t) => String(t).trim())
        .filter(Boolean)
        .map((t) => t.slice(0, 60))
    ),
  ].slice(0, 30);
}

async function resolvePlatform(input) {
  if (!input.platform) {
    return { platform: null, platformName: input.platformName || '' };
  }
  const platform = await Platform.findById(input.platform);
  if (!platform || !platform.active)
    throw new ApiError(400, 'INVALID_PLATFORM', 'Selected platform is not active');
  return { platform: platform._id, platformName: platform.name };
}

function applyEditable(cert, input) {
  for (const key of EDITABLE) {
    if (input[key] === undefined) continue;
    if (key === 'startDate' || key === 'endDate') cert[key] = parseDate(input[key]);
    else if (key === 'skillTags') cert.skillTags = normalizeSkillTags(input[key]);
    else if (key === 'platform') cert[key] = input[key] || null;
    else cert[key] = input[key];
  }
}

async function createCertificate(studentId, input) {
  const student = await User.findById(studentId).select('name department batch role');
  if (!student) throw new ApiError(404, 'NOT_FOUND', 'Student not found');

  if (student.role !== 'admin') {
    const configured = await settingsService.get(
      'maxCertificatesPerSemester',
      env.MAX_CERTIFICATES_PER_SEMESTER
    );
    const limit = Math.max(1, Number(configured) || env.MAX_CERTIFICATES_PER_SEMESTER);
    const count = await Certificate.countDocuments({ student: student._id, deletedAt: null });
    if (count >= limit) {
      throw new ApiError(
        400,
        'SUBMISSION_LIMIT_REACHED',
        `You can submit at most ${limit} certificates.`
      );
    }
  }

  const resolved = await resolvePlatform(input);
  const cert = new Certificate({
    student: student._id,
    title: input.title,
    platform: resolved.platform,
    platformName: resolved.platformName,
    institute: input.institute || '',
    instructor: input.instructor || '',
    durationWeeks: input.durationWeeks,
    durationHours: input.durationHours,
    startDate: parseDate(input.startDate),
    endDate: parseDate(input.endDate),
    grade: input.grade || '',
    score: input.score,
    certificateId: input.certificateId || '',
    certificateUrl: input.certificateUrl || '',
    skillTags: normalizeSkillTags(input.skillTags),
    semester: input.semester || '',
    departmentSnapshot: student.department || '',
    batchSnapshot: student.batch || '',
  });
  await cert.save();
  return cert;
}

async function updateCertificate(cert, input) {
  if (!['DRAFT', 'NEEDS_CHANGES', 'REJECTED'].includes(cert.status)) {
    throw new ApiError(400, 'INVALID_STATE', 'This certificate can no longer be edited');
  }
  const before = cert.toObject();
  if (input.platform !== undefined) {
    const resolved = await resolvePlatform(input);
    cert.platform = resolved.platform;
    if (!input.platformName) cert.platformName = resolved.platformName;
  }
  applyEditable(cert, input);
  cert.version += 1;
  await cert.save();
  return { cert, before };
}

async function attachProof(cert, file) {
  if (!['DRAFT', 'NEEDS_CHANGES', 'REJECTED'].includes(cert.status)) {
    throw new ApiError(400, 'INVALID_STATE', 'Proof can only be replaced before approval');
  }
  cert.proof = {
    url: `/uploads/${path.basename(file.filename || file.path)}`,
    publicId: '',
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    hash: file.hash,
    uploadedAt: new Date(),
  };
  const trust = await computeTrust(cert);
  cert.trustScore = trust.score;
  cert.trustReasons = trust.reasons;
  cert.duplicateFlags = trust.reasons;
  cert.duplicateOf = trust.duplicateOf;
  cert.version += 1;
  await cert.save();
  return { cert, trust };
}

function proofPath(cert) {
  if (!cert.proof || !cert.proof.url) return null;
  const base = path.basename(cert.proof.url);
  const full = path.join(env.UPLOAD_DIR, base);
  return fs.existsSync(full) ? full : null;
}

async function runOcr(cert, { apply = false } = {}) {
  const full = proofPath(cert);
  if (!full)
    throw new ApiError(400, 'PROOF_REQUIRED', 'Upload a proof document before running OCR');
  const text = await extractText(full, cert.proof.mimetype);
  const suggestions = suggestFromText(text);
  suggestions.textPreview = text.slice(0, 1200);
  suggestions.extractedAt = new Date().toISOString();
  const student = await User.findById(cert.student).select('name');
  suggestions.nameMismatch = !nameMatchesAccount(
    suggestions.learnerName,
    student ? student.name : ''
  );
  if (suggestions.nameMismatch && !suggestions.learnerName) suggestions.nameMismatch = false;
  cert.ocrSuggestions = suggestions;
  if (apply) {
    if (suggestions.courseTitle) cert.title = suggestions.courseTitle;
    if (suggestions.certificateId) cert.certificateId = suggestions.certificateId;
    if (suggestions.platform && !cert.platformName) cert.platformName = suggestions.platform;
    if (suggestions.institute && !cert.institute) cert.institute = suggestions.institute;
    if (suggestions.startDate) cert.startDate = new Date(suggestions.startDate);
    if (suggestions.endDate) cert.endDate = new Date(suggestions.endDate);
    if (suggestions.grade && !cert.grade) cert.grade = suggestions.grade;
    if (suggestions.score != null && cert.score == null) cert.score = suggestions.score;
    if (suggestions.durationWeeks && !cert.durationWeeks)
      cert.durationWeeks = suggestions.durationWeeks;
    if (suggestions.durationHours && !cert.durationHours)
      cert.durationHours = suggestions.durationHours;
    if (suggestions.skillTags && suggestions.skillTags.length) {
      cert.skillTags = normalizeSkillTags([...(cert.skillTags || []), ...suggestions.skillTags]);
    }
  }
  const trust = await computeTrust(cert);
  cert.trustScore = trust.score;
  cert.trustReasons = trust.reasons;
  cert.duplicateOf = trust.duplicateOf;
  cert.version += 1;
  await cert.save();
  return { cert, suggestions, textLength: text.length, trust };
}

async function notifyVerifiers(cert, student) {
  const assignments = await FacultyAssignment.find({ student: cert.student })
    .select('faculty')
    .lean();
  let recipients = assignments.map((a) => a.faculty);
  if (!recipients.length && student.department) {
    const hods = await User.find({ role: 'hod', department: student.department, status: 'active' })
      .select('_id')
      .lean();
    recipients = hods.map((h) => h._id);
  }
  await Promise.all(
    recipients.map((recipient) =>
      notificationService.create({
        recipient,
        type: 'certificate_submitted',
        title: 'New certificate awaiting review',
        body: `${student.name} submitted "${cert.title}".`,
        link: `/certificates/${cert._id}`,
        data: { certificateId: String(cert._id) },
        dedupeKey: `submitted:${cert._id}:${cert.version}`,
      })
    )
  );
}

async function submitCertificate(cert, actor, req) {
  if (String(cert.student._id || cert.student) !== String(actor.id)) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only submit your own certificate');
  }
  if (!cert.proof || !cert.proof.url)
    throw new ApiError(400, 'PROOF_REQUIRED', 'Upload a proof document before submitting');
  if (!cert.title || !String(cert.title).trim())
    throw new ApiError(400, 'TITLE_REQUIRED', 'Certificate title is required');
  const from = cert.status;
  if (!canActorTransition('student', from, 'SUBMITTED')) {
    throw new ApiError(400, 'INVALID_TRANSITION', `Cannot submit a certificate in ${from} state`);
  }
  const trust = await computeTrust(cert);
  cert.trustScore = trust.score;
  cert.trustReasons = trust.reasons;
  cert.duplicateOf = trust.duplicateOf;
  cert.status = 'SUBMITTED';
  cert.submittedAt = cert.submittedAt || new Date();
  cert.remarks = '';
  cert.version += 1;
  await cert.save();
  await StatusHistory.create({
    certificate: cert._id,
    from,
    to: 'SUBMITTED',
    by: actor.id,
    actorRole: actor.role,
    remarks: '',
    ip: req?.ip || '',
    userAgent: req?.get?.('user-agent') || '',
  });
  const student = await User.findById(cert.student).select('name department');
  if (student) await notifyVerifiers(cert, student);
  return { cert, from, trust };
}

function buildSignedPayload(cert, student) {
  return {
    version: 1,
    issuer: env.INSTITUTION_NAME,
    issuerUrl: env.ISSUER_URL,
    verificationId: cert.verificationId,
    studentName: student ? student.name : '',
    studentDepartment: cert.departmentSnapshot || (student && student.department) || '',
    courseTitle: cert.title,
    platform: cert.platformName || '',
    certificateId: cert.certificateId || '',
    startDate: cert.startDate ? new Date(cert.startDate).toISOString().slice(0, 10) : null,
    endDate: cert.endDate ? new Date(cert.endDate).toISOString().slice(0, 10) : null,
    credits: cert.creditsAwarded || 0,
    issuedAt: new Date().toISOString(),
    documentHash: cert.proof ? cert.proof.hash || '' : '',
  };
}

async function assignVerificationId() {
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i += 1) {
    const id = `CT-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await Certificate.exists({ verificationId: id });
    if (!exists) return id;
  }
  throw new ApiError(500, 'ID_GENERATION_FAILED', 'Could not allocate a verification ID');
}

async function approveCertificate(cert, actor, req, remarks) {
  if (cert.status === 'APPROVED')
    throw new ApiError(400, 'INVALID_STATE', 'Certificate is already approved');
  const from = cert.status;
  const student = await User.findById(cert.student).select('name email department batch');
  if (!student) throw new ApiError(404, 'NOT_FOUND', 'Student not found');

  cert.status = 'APPROVED';
  cert.verifiedBy = actor.id;
  cert.verifiedAt = new Date();
  cert.remarks = remarks || '';
  cert.verificationId = cert.verificationId || (await assignVerificationId());

  const { credits, rule, breakdown } = await computeCredits(cert, { at: cert.verifiedAt });
  cert.creditsAwarded = credits;
  cert.creditRuleVersion = rule ? rule.version : null;
  cert.creditBreakdown = breakdown;

  await awardCredits(cert, actor.id);

  const payload = buildSignedPayload(cert, student);
  const { signature, kid } = cryptoService.sign(payload);
  cert.signedPayload = payload;
  cert.signature = signature;
  cert.signatureKeyId = kid;
  cert.qrCodeDataUrl = await makeVerificationQr(cert.verificationId);
  cert.version += 1;

  await cert.save();
  await StatusHistory.create({
    certificate: cert._id,
    from,
    to: 'APPROVED',
    by: actor.id,
    actorRole: actor.role,
    remarks: remarks || '',
    ip: req?.ip || '',
    userAgent: req?.get?.('user-agent') || '',
  });

  auditService.log({
    actor,
    action: 'certificate.approved',
    resource: 'Certificate',
    resourceId: cert._id,
    diff: {
      before: { status: from },
      after: { status: 'APPROVED', credits, verificationId: cert.verificationId },
    },
    req,
  });

  await notificationService.create({
    recipient: cert.student,
    type: 'certificate_approved',
    title: 'Certificate approved',
    body: `"${cert.title}" was approved with ${credits} credit(s).`,
    link: `/certificates/${cert._id}`,
    data: { certificateId: String(cert._id), credits },
    email: true,
    dedupeKey: `approved:${cert._id}`,
  });

  return { cert, credits, from };
}

async function revokeApproval(cert, actor, req, remarks) {
  if (cert.status !== 'APPROVED')
    throw new ApiError(400, 'INVALID_STATE', 'Only approved certificates can be revoked');
  if (!remarks || !String(remarks).trim())
    throw new ApiError(400, 'REMARKS_REQUIRED', 'A reason is required to revoke approval');
  const from = cert.status;
  cert.status = 'REJECTED';
  cert.verifiedBy = actor.id;
  cert.verifiedAt = new Date();
  cert.remarks = remarks;
  cert.creditsAwarded = 0;
  cert.creditRuleVersion = null;
  cert.creditBreakdown = null;
  cert.signature = '';
  cert.signedPayload = null;
  cert.qrCodeDataUrl = '';
  cert.version += 1;
  await cert.save();
  await reverseCredits(cert, actor.id, `Approval revoked: ${remarks}`);
  await StatusHistory.create({
    certificate: cert._id,
    from,
    to: 'REJECTED',
    by: actor.id,
    actorRole: actor.role,
    remarks,
    ip: req?.ip || '',
    userAgent: req?.get?.('user-agent') || '',
  });
  auditService.log({
    actor,
    action: 'certificate.approval_revoked',
    resource: 'Certificate',
    resourceId: cert._id,
    req,
    diff: { before: { status: from }, after: { status: 'REJECTED', remarks } },
  });
  await notificationService.create({
    recipient: cert.student,
    type: 'certificate_revoked',
    title: 'Certificate approval revoked',
    body: `Approval for "${cert.title}" was revoked. Reason: ${remarks}`,
    link: `/certificates/${cert._id}`,
    data: { certificateId: String(cert._id) },
    email: true,
    dedupeKey: `revoked:${cert._id}:${Date.now()}`,
  });
  return { cert, from };
}

async function transition(cert, actor, { to, remarks, version }, req) {
  if (!to) throw new ApiError(400, 'VALIDATION_ERROR', 'Target status is required');
  if (version !== undefined && Number(version) !== cert.version) {
    throw new ApiError(
      409,
      'CONFLICT',
      'Certificate was updated by someone else. Refresh and retry.'
    );
  }

  if (actor.role === 'student') {
    if (String(cert.student._id || cert.student) !== String(actor.id)) {
      throw new ApiError(403, 'FORBIDDEN', 'You can only change your own certificate');
    }
    if (to === 'SUBMITTED') return submitCertificate(cert, actor, req);
    if (!canActorTransition('student', cert.status, to)) {
      throw new ApiError(400, 'INVALID_TRANSITION', `Cannot move from ${cert.status} to ${to}`);
    }
    const from = cert.status;
    cert.status = to;
    cert.version += 1;
    await cert.save();
    await StatusHistory.create({
      certificate: cert._id,
      from,
      to,
      by: actor.id,
      actorRole: actor.role,
      remarks: remarks || '',
      ip: req?.ip || '',
      userAgent: req?.get?.('user-agent') || '',
    });
    return { cert, from };
  }

  if (cert.status === 'APPROVED' && to !== 'REJECTED') {
    throw new ApiError(400, 'INVALID_STATE', 'An approved certificate can only be revoked');
  }
  if (cert.status === 'APPROVED' && to === 'REJECTED') {
    await assertVerifier(actor, cert);
    if (!isOverride(actor.role, cert.status, to))
      throw new ApiError(403, 'FORBIDDEN', 'Override not allowed');
    return revokeApproval(cert, actor, req, remarks);
  }
  if (to === 'APPROVED') {
    if (!canActorTransition(actor.role, cert.status, to)) {
      throw new ApiError(400, 'INVALID_TRANSITION', `Cannot move from ${cert.status} to ${to}`);
    }
    if (!cert.proof || !cert.proof.url) {
      throw new ApiError(400, 'PROOF_REQUIRED', 'A proof document is required before approval');
    }
    await assertVerifier(actor, cert);
    return approveCertificate(cert, actor, req, remarks);
  }
  if (to === 'SUBMITTED') {
    return submitCertificate(cert, actor, req);
  }
  if (!canActorTransition(actor.role, cert.status, to)) {
    throw new ApiError(400, 'INVALID_TRANSITION', `Cannot move from ${cert.status} to ${to}`);
  }
  if (requiresRemarks(to) && (!remarks || !String(remarks).trim())) {
    throw new ApiError(400, 'REMARKS_REQUIRED', 'Remarks are required for this decision');
  }
  await assertVerifier(actor, cert);
  const from = cert.status;
  cert.status = to;
  cert.remarks = remarks || '';
  cert.verifiedBy = actor.id;
  cert.verifiedAt = new Date();
  cert.version += 1;
  await cert.save();
  await StatusHistory.create({
    certificate: cert._id,
    from,
    to,
    by: actor.id,
    actorRole: actor.role,
    remarks: remarks || '',
    ip: req?.ip || '',
    userAgent: req?.get?.('user-agent') || '',
  });
  auditService.log({
    actor,
    action: `certificate.${to.toLowerCase()}`,
    resource: 'Certificate',
    resourceId: cert._id,
    req,
    diff: { before: { status: from }, after: { status: to, remarks } },
  });
  await notificationService.create({
    recipient: cert.student,
    type: 'certificate_decision',
    title: `Certificate ${to.replace(/_/g, ' ').toLowerCase()}`,
    body: `"${cert.title}" is now ${to.replace(/_/g, ' ')}.${remarks ? ` Remarks: ${remarks}` : ''}`,
    link: `/certificates/${cert._id}`,
    data: { certificateId: String(cert._id), status: to },
    email: true,
    dedupeKey: `decision:${cert._id}:${cert.version}`,
  });
  return { cert, from };
}

async function listCertificates(actor, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const scopeIds = await getScopedStudentIds(actor);
  const q = { deletedAt: null };
  if (scopeIds) q.student = { $in: scopeIds };
  if (query.status) q.status = query.status;
  if (query.student) {
    if (scopeIds && !scopeIds.includes(String(query.student)))
      throw new ApiError(403, 'FORBIDDEN', 'Student is outside your scope');
    q.student = query.student;
  }
  if (query.platform) q.platform = query.platform;
  if (query.semester) q.semesterKey = String(query.semester).toUpperCase().replace(/\s+/g, '-');
  if (query.department) q.departmentSnapshot = query.department;
  if (query.assigned === 'me' && actor.role === 'faculty') {
    const ids = await FacultyAssignment.find({ faculty: actor.id }).select('student').lean();
    q.student = { $in: ids.map((r) => r.student) };
  }
  if (query.search) {
    const rx = new RegExp(String(query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ title: rx }, { platformName: rx }, { certificateId: rx }, { institute: rx }];
  }
  if (query.minTrust || query.maxTrust) {
    q.trustScore = {};
    if (query.minTrust) q.trustScore.$gte = Number(query.minTrust);
    if (query.maxTrust) q.trustScore.$lte = Number(query.maxTrust);
  }
  if (query.from || query.to) {
    q.createdAt = {};
    if (query.from) q.createdAt.$gte = new Date(query.from);
    if (query.to) q.createdAt.$lte = new Date(query.to);
  }
  const allowedSort = [
    'createdAt',
    'updatedAt',
    'title',
    'status',
    'trustScore',
    'creditsAwarded',
    'submittedAt',
  ];
  const sortField = allowedSort.includes(String(query.sort).replace(/^-/, ''))
    ? String(query.sort).replace(/^-/, '')
    : 'createdAt';
  const sortDir = String(query.sort || '').startsWith('-') ? -1 : query.sort ? 1 : -1;

  const [items, total] = await Promise.all([
    Certificate.find(q)
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('student', 'name email department batch')
      .populate('platform', 'name')
      .lean(),
    Certificate.countDocuments(q),
  ]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getCertificate(id, actor) {
  const cert = await Certificate.findOne({ _id: id, deletedAt: null })
    .populate('student', 'name email department batch rollNumber')
    .populate('verifiedBy', 'name role');
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  if (actor) await assertCertificateAccess(actor, cert);
  return cert;
}

async function getHistory(id, actor) {
  await getCertificate(id, actor);
  return StatusHistory.find({ certificate: id }).sort({ at: 1 }).populate('by', 'name role').lean();
}

async function removeCertificate(cert) {
  if (['APPROVED', 'SUBMITTED', 'UNDER_REVIEW'].includes(cert.status)) {
    throw new ApiError(
      400,
      'INVALID_STATE',
      'Certificates in review or approved cannot be deleted. Approved certificates must be revoked first.'
    );
  }

  if (cert.status !== 'DRAFT') {
    cert.deletedAt = new Date();
    cert.version += 1;
    await cert.save();
    return { softDeleted: true };
  }

  await StatusHistory.deleteMany({ certificate: cert._id });
  await Certificate.deleteOne({ _id: cert._id });
  return { softDeleted: false };
}

async function checkExternalLink(cert, actor) {
  if (!cert.certificateUrl) throw new ApiError(400, 'URL_REQUIRED', 'No certificate URL to check');
  const target = assertPublicHttpUrl(cert.certificateUrl, { field: 'Certificate URL' });
  let result = 'manual';
  let note = 'URL recorded for manual review';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(target, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (response.status >= 300 && response.status < 400) {
      result = 'manual';
      note = `Redirected (HTTP ${response.status}); open manually to verify the destination`;
    } else {
      result = response.ok ? 'link_valid' : 'link_invalid';
      note = `HTTP ${response.status} from ${target.hostname}`;
    }
  } catch (err) {
    result = 'link_invalid';
    note = `Could not reach URL: ${err.message}`;
  }
  cert.externalVerification = {
    url: cert.certificateUrl,
    checkedAt: new Date(),
    checkedBy: actor.id,
    result,
    note,
  };
  cert.version += 1;
  await cert.save();
  return cert.externalVerification;
}

function maskName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Unknown';
  return parts
    .map((p) => `${p[0].toUpperCase()}${'*'.repeat(Math.max(1, p.length - 1))}`)
    .join(' ');
}

async function getPublicVerification(verificationId) {
  const cert = await Certificate.findOne({ verificationId, deletedAt: null })
    .populate('student', 'name')
    .lean();
  if (!cert) return null;
  const signatureValid = Boolean(
    cert.status === 'APPROVED' &&
    cert.signedPayload &&
    cert.signature &&
    cryptoService.verify(cert.signedPayload, cert.signature, cert.signatureKeyId)
  );
  return {
    valid: cert.status === 'APPROVED' && signatureValid,
    status: cert.status,
    verificationId: cert.verificationId,
    studentName: maskName(cert.student?.name),
    courseTitle: cert.title,
    platform: cert.platformName,
    institute: cert.institute,
    startDate: cert.startDate ? new Date(cert.startDate).toISOString().slice(0, 10) : null,
    endDate: cert.endDate ? new Date(cert.endDate).toISOString().slice(0, 10) : null,
    credits: cert.creditsAwarded,
    issuedAt: cert.verifiedAt,
    signatureValid,
    keyId: cert.signatureKeyId || null,
    issuer: env.INSTITUTION_NAME,
    verifiedAt: cert.verifiedAt,
    qrCodeDataUrl: cert.qrCodeDataUrl || '',
  };
}

async function addSignatureIfMissing(cert) {
  if (cert.status !== 'APPROVED' || cert.signature) return cert;
  const student = await User.findById(cert.student).select('name');
  const payload = buildSignedPayload(cert, student);
  const { signature, kid } = cryptoService.sign(payload);
  cert.signedPayload = payload;
  cert.signature = signature;
  cert.signatureKeyId = kid;
  await cert.save();
  return cert;
}

module.exports = {
  createCertificate,
  updateCertificate,
  attachProof,
  runOcr,
  submitCertificate,
  transition,
  approveCertificate,
  revokeApproval,
  listCertificates,
  getCertificate,
  getHistory,
  removeCertificate,
  checkExternalLink,
  buildSignedPayload,
  getPublicVerification,
  maskName,
  addSignatureIfMissing,
  resolvePlatform,
  proofPath,
  canAccessCertificate,
};
