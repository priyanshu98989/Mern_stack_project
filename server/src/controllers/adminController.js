const crypto = require('crypto');
const User = require('../models/User');
const Certificate = require('../models/Certificate');
const { Department, Batch } = require('../models/Org');
const FacultyAssignment = require('../models/FacultyAssignment');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { parseCsv, toCsv } = require('../utils/csv');
const { escapeRegex, paginationMeta } = require('../utils/pagination');
const { getScopedStudentIds } = require('../middleware/ownership');
const settingsService = require('../services/settingsService');
const authService = require('../services/authService');
const certificateService = require('../services/certificateService');
const auditService = require('../services/auditService');

function tempPassword() {
  return `Ct!${crypto.randomBytes(6).toString('hex')}A1`;
}

function cleanUser(user) {
  return user.toSafeJSON ? user.toSafeJSON() : user;
}

function pageOf(query) {
  return {
    page: Math.max(1, Number(query.page) || 1),
    limit: Math.min(200, Math.max(1, Number(query.limit) || 20)),
  };
}

exports.listUsers = asyncHandler(async (req, res) => {
  const { role, department, batch, status, search } = req.query;
  const { page, limit } = pageOf(req.query);
  const q = {};
  if (role) q.role = role;
  if (department) q.department = department;
  if (batch) q.batch = batch;
  if (status) q.status = status;
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    q.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(q)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(q),
  ]);
  ok(res, { items }, paginationMeta(total, page, limit));
});

exports.listStudents = asyncHandler(async (req, res) => {
  const scope = await getScopedStudentIds(req.user);
  const { page, limit } = pageOf(req.query);
  const q = { role: 'student' };
  if (scope) q._id = { $in: scope };
  if (req.query.department) q.department = req.query.department;
  if (req.query.batch) q.batch = req.query.batch;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    q.$or = [{ name: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(q)
      .select('name email department batch status emailVerified createdAt')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(q),
  ]);
  ok(res, { items }, paginationMeta(total, page, limit));
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  if (req.user.role === 'hod') {
    if (user.role === 'admin')
      throw new ApiError(403, 'FORBIDDEN', 'Admins are outside your scope');
    if (String(user._id) !== String(req.user.id) && user.department !== req.user.department) {
      throw new ApiError(403, 'FORBIDDEN', 'User is outside your department');
    }
  }
  const [certificates, credits] = await Promise.all([
    Certificate.find({ student: user._id, deletedAt: null })
      .select('title status creditsAwarded semesterKey createdAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    require('../services/creditService').getUserCredits(user._id),
  ]);
  ok(res, { user, certificates, credits });
});

exports.createUser = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const exists = await User.findOne({ email: body.email.toLowerCase() });
  if (exists) throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
  const password = body.password || tempPassword();
  const user = await User.create({
    name: body.name,
    email: body.email.toLowerCase(),
    password,
    role: body.role || 'student',
    department: body.department || '',
    batch: body.batch || '',
    phone: body.phone || '',
    status: 'active',
    emailVerified: body.emailVerified !== false,
  });
  auditService.log({
    actor: req.user,
    action: 'admin.user_created',
    resource: 'User',
    resourceId: user._id,
    diff: { after: { email: user.email, role: user.role } },
    req,
  });
  created(res, { user: cleanUser(user), temporaryPassword: body.password ? undefined : password });
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const body = req.validated.body;
  if (String(user._id) === String(req.user.id) && body.role && body.role !== 'admin') {
    throw new ApiError(400, 'SELF_DEMOTE', 'You cannot remove your own admin role');
  }
  const allowed = [
    'name',
    'email',
    'role',
    'department',
    'batch',
    'phone',
    'status',
    'emailVerified',
    'departmentId',
    'batchId',
  ];
  const before = {};
  for (const key of allowed) {
    if (body[key] === undefined) continue;
    before[key] = user[key];
    user[key] = key === 'email' ? String(body[key]).toLowerCase() : body[key];
  }
  await user.save();
  if (body.status && body.status !== 'active') await authService.revokeAllForUser(user._id);
  auditService.log({
    actor: req.user,
    action: 'admin.user_updated',
    resource: 'User',
    resourceId: user._id,
    diff: { before, after: body },
    req,
  });
  ok(res, { user: cleanUser(user) });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user.id))
    throw new ApiError(400, 'SELF_DELETE', 'You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  user.status = 'suspended';
  user.deletedAt = new Date();
  await user.save();
  await authService.revokeAllForUser(user._id);
  auditService.log({
    actor: req.user,
    action: 'admin.user_suspended',
    resource: 'User',
    resourceId: user._id,
    req,
  });
  ok(res, { message: 'User suspended; records retained for audit' });
});

exports.resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  const password = tempPassword();
  user.password = password;
  await user.save();
  await authService.revokeAllForUser(user._id);
  auditService.log({
    actor: req.user,
    action: 'admin.password_reset',
    resource: 'User',
    resourceId: user._id,
    req,
  });
  ok(res, { temporaryPassword: password });
});

exports.exportUsers = asyncHandler(async (req, res) => {
  const rows = await User.find({})
    .select('name email role department batch status emailVerified createdAt')
    .lean();
  const csv = toCsv(rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })));
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send(csv);
});

exports.listDepartments = asyncHandler(async (req, res) => {
  ok(res, { items: await Department.find().sort({ name: 1 }).lean() });
});

exports.createDepartment = asyncHandler(async (req, res) => {
  const d = await Department.create(req.validated.body);
  auditService.log({
    actor: req.user,
    action: 'admin.department_created',
    resource: 'Department',
    resourceId: d._id,
    req,
  });
  created(res, { department: d });
});

exports.updateDepartment = asyncHandler(async (req, res) => {
  const d = await Department.findByIdAndUpdate(req.params.id, req.validated.body, {
    new: true,
    runValidators: true,
  });
  if (!d) throw new ApiError(404, 'NOT_FOUND', 'Department not found');
  auditService.log({
    actor: req.user,
    action: 'admin.department_updated',
    resource: 'Department',
    resourceId: d._id,
    req,
  });
  ok(res, { department: d });
});

exports.listBatches = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.department) q.department = req.query.department;
  ok(res, {
    items: await Batch.find(q)
      .populate('department', 'name code')
      .sort({ year: -1, name: 1 })
      .lean(),
  });
});

exports.createBatch = asyncHandler(async (req, res) => {
  const b = await Batch.create(req.validated.body);
  auditService.log({
    actor: req.user,
    action: 'admin.batch_created',
    resource: 'Batch',
    resourceId: b._id,
    req,
  });
  created(res, { batch: b });
});

exports.listAssignments = asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.faculty) q.faculty = req.query.faculty;
  if (req.query.student) q.student = req.query.student;
  const items = await FacultyAssignment.find(q)
    .populate('faculty', 'name email department')
    .populate('student', 'name email department batch')
    .sort({ createdAt: -1 })
    .lean();
  if (req.user.role === 'hod') {
    ok(res, {
      items: items.filter((a) => a.student && a.student.department === req.user.department),
    });
    return;
  }
  ok(res, { items });
});

exports.createAssignment = asyncHandler(async (req, res) => {
  const { faculty, student, note } = req.validated.body;
  const [f, s] = await Promise.all([
    User.findOne({ _id: faculty, role: 'faculty', status: 'active' }),
    User.findOne({ _id: student, role: 'student', status: 'active' }),
  ]);
  if (!f) throw new ApiError(400, 'INVALID_FACULTY', 'Faculty member not found');
  if (!s) throw new ApiError(400, 'INVALID_STUDENT', 'Student not found');
  if (
    req.user.role === 'hod' &&
    (f.department !== req.user.department || s.department !== req.user.department)
  ) {
    throw new ApiError(403, 'FORBIDDEN', 'HOD can only assign within their department');
  }
  if (f.department !== s.department)
    throw new ApiError(
      400,
      'DEPARTMENT_MISMATCH',
      'Faculty and student must be in the same department'
    );
  try {
    const a = await FacultyAssignment.create({
      faculty: f._id,
      student: s._id,
      assignedBy: req.user.id,
      note: note || '',
    });
    auditService.log({
      actor: req.user,
      action: 'admin.assignment_created',
      resource: 'FacultyAssignment',
      resourceId: a._id,
      req,
    });
    created(res, { assignment: a });
  } catch (err) {
    if (err.code === 11000)
      throw new ApiError(
        409,
        'ASSIGNMENT_EXISTS',
        'This student is already assigned to this faculty member'
      );
    throw err;
  }
});

exports.deleteAssignment = asyncHandler(async (req, res) => {
  const a = await FacultyAssignment.findById(req.params.id).populate('student', 'department');
  if (!a) throw new ApiError(404, 'NOT_FOUND', 'Assignment not found');
  if (req.user.role === 'hod' && a.student?.department !== req.user.department) {
    throw new ApiError(403, 'FORBIDDEN', 'Assignment is outside your department');
  }
  await FacultyAssignment.deleteOne({ _id: a._id });
  auditService.log({
    actor: req.user,
    action: 'admin.assignment_deleted',
    resource: 'FacultyAssignment',
    resourceId: a._id,
    req,
  });
  ok(res, { message: 'Assignment removed' });
});

exports.bulkAssignments = asyncHandler(async (req, res) => {
  const rows = req.validated.body.rows || [];
  const results = { created: 0, skipped: 0, errors: [] };
  for (const row of rows) {
    try {
      const [f, s] = await Promise.all([
        User.findOne({ email: String(row.facultyEmail).toLowerCase(), role: 'faculty' }),
        User.findOne({ email: String(row.studentEmail).toLowerCase(), role: 'student' }),
      ]);
      if (!f || !s) throw new Error('faculty or student not found');
      if (f.department !== s.department) throw new Error('department mismatch');
      await FacultyAssignment.create({ faculty: f._id, student: s._id, assignedBy: req.user.id });
      results.created += 1;
    } catch (err) {
      if (err.code === 11000) results.skipped += 1;
      else results.errors.push({ row, error: err.message });
    }
  }
  auditService.log({
    actor: req.user,
    action: 'admin.assignments_bulk',
    resource: 'FacultyAssignment',
    diff: { after: results },
    req,
  });
  ok(res, results);
});

exports.importUsers = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'FILE_REQUIRED', 'Upload a CSV file');
  const text = require('fs').readFileSync(req.file.path, 'utf8');
  const rows = parseCsv(text);
  if (!rows.length) throw new ApiError(400, 'EMPTY_FILE', 'CSV has no data rows');
  if (rows.length > 500) throw new ApiError(400, 'TOO_MANY_ROWS', 'Import is limited to 500 rows');
  const results = { created: 0, skipped: 0, errors: [], temporaryPasswords: [] };
  for (const [index, row] of rows.entries()) {
    try {
      const email = String(row.email || '')
        .trim()
        .toLowerCase();
      const name = String(row.name || '').trim();
      if (!name || !email) throw new Error('name and email are required');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('invalid email');
      const role = ['student', 'faculty', 'hod'].includes(row.role) ? row.role : 'student';
      const exists = await User.findOne({ email });
      if (exists) {
        results.skipped += 1;
        continue;
      }
      const password = row.password || tempPassword();
      await User.create({
        name,
        email,
        password,
        role,
        department: row.department || '',
        batch: row.batch || '',
        emailVerified: true,
        status: 'active',
      });
      results.created += 1;
      if (!row.password) results.temporaryPasswords.push({ email, password });
    } catch (err) {
      results.errors.push({ row: index + 2, error: err.message });
    }
  }
  auditService.log({
    actor: req.user,
    action: 'admin.users_imported',
    resource: 'User',
    diff: { after: { created: results.created, skipped: results.skipped } },
    req,
  });
  ok(res, results);
});

exports.importCertificates = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'FILE_REQUIRED', 'Upload a CSV file');
  const text = require('fs').readFileSync(req.file.path, 'utf8');
  const rows = parseCsv(text);
  if (!rows.length) throw new ApiError(400, 'EMPTY_FILE', 'CSV has no data rows');
  if (rows.length > 500) throw new ApiError(400, 'TOO_MANY_ROWS', 'Import is limited to 500 rows');
  const results = { created: 0, errors: [] };
  for (const [index, row] of rows.entries()) {
    try {
      const student = await User.findOne({
        email: String(row.studentEmail || '').toLowerCase(),
        role: 'student',
      });
      if (!student) throw new Error('student not found');
      if (!row.title) throw new Error('title is required');
      const cert = await certificateService.createCertificate(student._id, {
        title: row.title,
        platformName: row.platform || row.platformName || '',
        institute: row.institute || '',
        instructor: row.instructor || '',
        durationWeeks: row.durationWeeks ? Number(row.durationWeeks) : undefined,
        durationHours: row.durationHours ? Number(row.durationHours) : undefined,
        startDate: row.startDate || undefined,
        endDate: row.endDate || undefined,
        grade: row.grade || '',
        score: row.score ? Number(row.score) : undefined,
        certificateId: row.certificateId || '',
        certificateUrl: row.certificateUrl || '',
        skillTags: row.skillTags
          ? String(row.skillTags)
              .split(/[;|]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        semester: row.semester || '',
      });
      results.created += 1;
      if (row.status === 'SUBMITTED')
        await certificateService
          .submitCertificate(cert, { id: String(student._id), role: 'student' }, req)
          .catch(() => {});
    } catch (err) {
      results.errors.push({ row: index + 2, error: err.message });
    }
  }
  auditService.log({
    actor: req.user,
    action: 'admin.certificates_imported',
    resource: 'Certificate',
    diff: { after: { created: results.created } },
    req,
  });
  ok(res, results);
});

exports.getSettings = asyncHandler(async (req, res) => {
  ok(res, { settings: await settingsService.getAll() });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  const body = req.validated.body.settings || req.validated.body;
  const allowed = [
    'institutionName',
    'requiredCredits',
    'slaRemindDays',
    'slaEscalateDays',
    'allowSelfRegister',
    'maintenanceMode',
    'maxCertificatesPerSemester',
    'aiEnabled',
    'ocrAutoRun',
  ];
  const changed = {};
  for (const [key, value] of Object.entries(body)) {
    if (!allowed.includes(key))
      throw new ApiError(400, 'INVALID_SETTING', `Unknown setting: ${key}`);
    await settingsService.set(key, value, req.user.id);
    changed[key] = value;
  }
  auditService.log({
    actor: req.user,
    action: 'admin.settings_updated',
    resource: 'Setting',
    diff: { after: changed },
    req,
  });
  ok(res, { settings: await settingsService.getAll() });
});
