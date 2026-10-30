const Certificate = require('../models/Certificate');
const CreditRule = require('../models/CreditRule');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const creditService = require('../services/creditService');
const settingsService = require('../services/settingsService');
const auditService = require('../services/auditService');
const { assertStudentAccess, assertCertificateAccess } = require('../middleware/ownership');

exports.me = asyncHandler(async (req, res) => {
  const settings = await settingsService.getAll();
  const [summary, ledger] = await Promise.all([
    creditService.getSummary(req.user.id),
    creditService.getLedger(req.user.id, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 10,
    }),
  ]);
  ok(res, {
    totalCredits: summary.total,
    requiredCredits: settings.requiredCredits,
    progress: settings.requiredCredits
      ? Math.min(100, Math.round((summary.total / settings.requiredCredits) * 100))
      : 0,
    summary,
    ledger,
  });
});

exports.forUser = asyncHandler(async (req, res) => {
  await assertStudentAccess(req.user, req.params.userId);
  const [total, summary, ledger] = await Promise.all([
    creditService.getUserCredits(req.params.userId),
    creditService.getSummary(req.params.userId),
    creditService.getLedger(req.params.userId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    }),
  ]);
  ok(res, { totalCredits: total, summary, ledger });
});

exports.ledger = asyncHandler(async (req, res) => {
  const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;
  await assertStudentAccess(req.user, userId);
  const data = await creditService.getLedger(userId, {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  ok(
    res,
    { items: data.items },
    { total: data.total, page: data.page, limit: data.limit, totalPages: data.totalPages }
  );
});

exports.breakdown = asyncHandler(async (req, res) => {
  const cert = await Certificate.findById(req.params.id || req.params.certificateId);
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  const data = await creditService.getBreakdown(cert._id, cert.student);
  ok(res, data);
});

exports.listRules = asyncHandler(async (req, res) => {
  const active = req.query.active === undefined ? undefined : req.query.active === 'true';
  const items = await creditService.listRules({ active });
  ok(res, { items });
});

exports.createRule = asyncHandler(async (req, res) => {
  const body = { ...req.validated.body };
  if (!body.platform) body.platform = null;
  if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
  if (body.effectiveUntil) body.effectiveUntil = new Date(body.effectiveUntil);
  const rule = await creditService.createRuleVersion(body, req.user.id);
  auditService.log({
    actor: req.user,
    action: 'credit_rule.created',
    resource: 'CreditRule',
    resourceId: rule._id,
    diff: { after: body },
    req,
  });
  created(res, { rule });
});

exports.updateRule = asyncHandler(async (req, res) => {
  const body = { ...req.validated.body };
  if (body.platform === '') body.platform = null;
  if (body.effectiveFrom) body.effectiveFrom = new Date(body.effectiveFrom);
  if (body.effectiveUntil) body.effectiveUntil = new Date(body.effectiveUntil);
  const rule = await creditService.updateRuleVersion(req.params.id, body, req.user.id);
  if (!rule) throw new ApiError(404, 'NOT_FOUND', 'Credit rule not found');
  auditService.log({
    actor: req.user,
    action: 'credit_rule.versioned',
    resource: 'CreditRule',
    resourceId: rule._id,
    diff: { after: body },
    req,
  });
  created(res, { rule });
});

exports.deactivateRule = asyncHandler(async (req, res) => {
  const rule = await CreditRule.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!rule) throw new ApiError(404, 'NOT_FOUND', 'Credit rule not found');
  auditService.log({
    actor: req.user,
    action: 'credit_rule.deactivated',
    resource: 'CreditRule',
    resourceId: rule._id,
    req,
  });
  ok(res, { rule });
});

exports.simulate = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const fake = {
    student: req.user.id,
    platform: body.platform || null,
    platformName: body.platformName || '',
    durationWeeks: body.durationWeeks || 0,
    durationHours: body.durationHours || 0,
    score: body.score || 0,
    grade: body.grade || '',
    semester: body.semester || '',
    semesterKey: body.semester
      ? String(body.semester).trim().toUpperCase().replace(/\s+/g, '-')
      : '',
  };
  const result = await creditService.computeCredits(fake);
  ok(res, { credits: result.credits, rule: result.rule, breakdown: result.breakdown });
});

exports.adjust = asyncHandler(async (req, res) => {
  const { userId, certificateId, credits, note } = req.validated.body;
  const cert = await Certificate.findById(certificateId);
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertStudentAccess(req.user, userId);
  const ledger = await creditService.adjustCredits({
    userId,
    certificateId,
    credits,
    note,
    by: req.user.id,
  });
  auditService.log({
    actor: req.user,
    action: 'credit.adjusted',
    resource: 'CreditLedger',
    resourceId: ledger._id,
    diff: { after: { userId, certificateId, credits, note } },
    req,
  });
  ok(res, { ledger });
});
