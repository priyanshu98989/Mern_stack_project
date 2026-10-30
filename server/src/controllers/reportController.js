const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/reportService');
const { getScopedStudentIds, assertStudentAccess } = require('../middleware/ownership');
const { buildCertificateQuery } = require('../services/reportService');
const auditService = require('../services/auditService');

function sendFile(res, result) {
  res.setHeader('Content-Type', result.contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${result.filename.replace(/"/g, '')}"`
  );
  res.setHeader('Cache-Control', 'no-store');
  return res.send(result.buffer);
}

function fmt(req) {
  const format = String(req.query.format || 'pdf').toLowerCase();
  if (!['csv', 'xlsx', 'pdf'].includes(format))
    throw new ApiError(400, 'INVALID_FORMAT', 'format must be csv, xlsx or pdf');
  return format;
}

exports.transcript = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId === 'me' ? req.user.id : req.params.studentId;
  await assertStudentAccess(req.user, studentId);
  const result = await reportService.exportTranscript(studentId, fmt(req));
  if (!result) throw new ApiError(404, 'NOT_FOUND', 'Student not found');
  auditService.log({
    actor: req.user,
    action: 'report.transcript_exported',
    resource: 'User',
    resourceId: studentId,
    req,
  });
  sendFile(res, result);
});

exports.department = asyncHandler(async (req, res) => {
  const department = req.query.department || req.user.department;
  if (!department) throw new ApiError(400, 'DEPARTMENT_REQUIRED', 'Department is required');
  if (req.user.role !== 'admin' && department !== req.user.department) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only export your own department');
  }
  const result = await reportService.exportDepartment(department, fmt(req));
  auditService.log({
    actor: req.user,
    action: 'report.department_exported',
    resource: 'Department',
    resourceId: department,
    req,
  });
  sendFile(res, result);
});

exports.departmentJson = asyncHandler(async (req, res) => {
  const department = req.query.department || req.user.department;
  if (!department) throw new ApiError(400, 'DEPARTMENT_REQUIRED', 'Department is required');
  if (req.user.role !== 'admin' && department !== req.user.department) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only view your own department');
  }
  ok(res, await reportService.departmentReport(department));
});

exports.certificates = asyncHandler(async (req, res) => {
  const scopeIds = await getScopedStudentIds(req.user);
  const filters = {
    scopeIds,
    status: req.query.status,
    department: req.user.role === 'admin' ? req.query.department : req.user.department,
    platform: req.query.platform,
    semester: req.query.semester,
    from: req.query.from,
    to: req.query.to,
    search: req.query.search,
  };
  const result = await reportService.exportCertificates(fmt(req), filters);
  auditService.log({
    actor: req.user,
    action: 'report.certificates_exported',
    resource: 'Certificate',
    diff: { after: filters },
    req,
  });
  sendFile(res, result);
});

exports.certificatesJson = asyncHandler(async (req, res) => {
  const scopeIds = await getScopedStudentIds(req.user);
  const filters = {
    scopeIds,
    status: req.query.status,
    department: req.user.role === 'admin' ? req.query.department : req.user.department,
    platform: req.query.platform,
    semester: req.query.semester,
    from: req.query.from,
    to: req.query.to,
    search: req.query.search,
  };
  const rows = await reportService.certificateRows(filters);
  ok(res, { items: rows, query: buildCertificateQuery(filters) });
});

exports.audit = asyncHandler(async (req, res) => {
  const filters = {
    department: req.user.role === 'admin' ? req.query.department : req.user.department,
    actor: req.query.actor,
    action: req.query.action,
    from: req.query.from,
    to: req.query.to,
  };
  const format = String(req.query.format || 'csv').toLowerCase();
  if (!['csv', 'xlsx'].includes(format))
    throw new ApiError(400, 'INVALID_FORMAT', 'Audit export supports csv or xlsx');
  const result = await reportService.exportAudit(filters, format);
  auditService.log({
    actor: req.user,
    action: 'report.audit_exported',
    resource: 'AuditLog',
    diff: { after: filters },
    req,
  });
  sendFile(res, result);
});
