const Notification = require('../models/Notification');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { ok, paginated } = require('../utils/response');
const { paginationMeta } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const q = { recipient: req.user.id };
  if (req.query.unread === 'true') q.read = false;
  if (req.query.type) q.type = req.query.type;
  const [items, total, unreadCount] = await Promise.all([
    Notification.find(q)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(q),
    Notification.countDocuments({ recipient: req.user.id, read: false }),
  ]);
  paginated(res, { items, unreadCount }, paginationMeta(total, page, limit));
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user.id },
    { read: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  ok(res, { notification });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user.id, read: false },
    { read: true }
  );
  ok(res, { modified: result.modifiedCount });
});

exports.remove = asyncHandler(async (req, res) => {
  const result = await Notification.deleteOne({ _id: req.params.id, recipient: req.user.id });
  if (!result.deletedCount) throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  ok(res, { message: 'Notification deleted' });
});

exports.getPrefs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('notificationPrefs').lean();
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  ok(res, { preferences: user.notificationPrefs || {} });
});

exports.updatePrefs = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'User not found');
  user.notificationPrefs = {
    ...(user.notificationPrefs.toObject ? user.notificationPrefs.toObject() : {}),
    ...req.validated.body,
  };
  await user.save();
  ok(res, { preferences: user.notificationPrefs });
});
