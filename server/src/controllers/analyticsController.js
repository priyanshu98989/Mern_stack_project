const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const analytics = require('../services/analyticsService');
const settingsService = require('../services/settingsService');
const { getScopedStudentIds, assertStudentAccess } = require('../middleware/ownership');

exports.student = asyncHandler(async (req, res) => {
  const userId = req.params.id === 'me' ? req.user.id : req.params.id;
  await assertStudentAccess(req.user, userId);
  const settings = await settingsService.getAll();
  const data = await analytics.studentAnalytics(userId, {
    requiredCredits: settings.requiredCredits,
  });
  ok(res, data);
});

exports.faculty = asyncHandler(async (req, res) => {
  const facultyId = req.params.id === 'me' ? req.user.id : req.params.id;
  const user = await User.findById(facultyId).select('role department name');
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  if (user.role !== 'faculty' && user.role !== 'hod')
    throw new ApiError(400, 'INVALID_ROLE', 'User is not a faculty member');
  if (req.user.role === 'hod' && user.department !== req.user.department) {
    throw new ApiError(403, 'FORBIDDEN', 'Faculty member is outside your department');
  }
  if (req.user.role === 'faculty' && String(req.user.id) !== String(facultyId)) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only view your own analytics');
  }
  ok(res, await analytics.facultyAnalytics(facultyId));
});

exports.department = asyncHandler(async (req, res) => {
  let department = req.params.id === 'me' ? req.user.department : req.params.id;
  if (!department) {
    const me = await User.findById(req.user.id).select('department');
    department = me ? me.department : '';
  }
  if (req.user.role !== 'admin' && department !== req.user.department) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only view your own department');
  }
  ok(res, await analytics.departmentAnalytics(department));
});

exports.leaderboard = asyncHandler(async (req, res) => {
  const scope = await getScopedStudentIds(req.user);
  ok(res, {
    items: await analytics.leaderboard({ scopeIds: scope, limit: Number(req.query.limit) || 10 }),
  });
});

exports.trends = asyncHandler(async (req, res) => {
  const scope = await getScopedStudentIds(req.user);
  ok(res, { items: await analytics.trends({ scopeIds: scope }) });
});

exports.overview = asyncHandler(async (req, res) => {
  ok(res, await analytics.overview());
});
