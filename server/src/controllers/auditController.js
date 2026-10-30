const AuditLog = require('../models/AuditLog');
const { ok } = require('../utils/response');
const { escapeRegex, paginationMeta } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const q = {};
  if (req.user.role === 'hod') q.actorDepartment = req.user.department;
  else if (req.query.department) q.actorDepartment = req.query.department;
  if (req.query.actor) q.actor = req.query.actor;
  if (req.query.resource) q.resource = req.query.resource;
  if (req.query.resourceId) q.resourceId = req.query.resourceId;
  if (req.query.action) q.action = new RegExp(escapeRegex(req.query.action), 'i');
  if (req.query.from || req.query.to) {
    q.createdAt = {};
    if (req.query.from) q.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) q.createdAt.$lte = new Date(req.query.to);
  }
  const [items, total] = await Promise.all([
    AuditLog.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('actor', 'name email role')
      .lean(),
    AuditLog.countDocuments(q),
  ]);
  ok(res, { items }, paginationMeta(total, page, limit));
});
