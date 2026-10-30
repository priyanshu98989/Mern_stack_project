const Comment = require('../models/Comment');
const Certificate = require('../models/Certificate');
const FacultyAssignment = require('../models/FacultyAssignment');
const ApiError = require('../utils/ApiError');
const { ok, created } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { assertCertificateAccess } = require('../middleware/ownership');
const notificationService = require('../services/notificationService');

async function loadCert(req) {
  const cert = await Certificate.findById(req.params.id).select('student title status');
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  return cert;
}

exports.list = asyncHandler(async (req, res) => {
  await loadCert(req);
  const items = await Comment.find({ certificate: req.params.id })
    .sort({ createdAt: 1 })
    .populate('author', 'name role profilePhoto')
    .lean();
  ok(res, { items });
});

exports.create = asyncHandler(async (req, res) => {
  const cert = await loadCert(req);
  const text = req.validated.body.text;
  const comment = await Comment.create({
    certificate: cert._id,
    author: req.user.id,
    authorRole: req.user.role,
    text,
  });
  const populated = await comment.populate('author', 'name role profilePhoto');

  if (req.user.role === 'student') {
    const rows = await FacultyAssignment.find({ student: req.user.id }).select('faculty').lean();
    for (const row of rows) {
      await notificationService.create({
        recipient: row.faculty,
        type: 'comment',
        title: 'Student replied on a certificate',
        body: text.slice(0, 180),
        link: `/verifier/${cert._id}`,
        data: { certificateId: String(cert._id) },
        dedupeKey: `comment:${comment._id}:${row.faculty}`,
      });
    }
  } else if (String(cert.student) !== req.user.id) {
    await notificationService.create({
      recipient: cert.student,
      type: 'comment',
      title: 'New comment on your certificate',
      body: text.slice(0, 180),
      link: `/certificates/${cert._id}`,
      data: { certificateId: String(cert._id) },
      dedupeKey: `comment:${comment._id}:${cert.student}`,
      email: false,
    });
  }

  created(res, { comment: populated });
});

exports.remove = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw new ApiError(404, 'NOT_FOUND', 'Comment not found');
  const cert = await Certificate.findById(comment.certificate).select('student');
  if (!cert) throw new ApiError(404, 'NOT_FOUND', 'Certificate not found');
  await assertCertificateAccess(req.user, cert);
  if (String(comment.author) !== req.user.id && req.user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own comment');
  }
  await Comment.deleteOne({ _id: comment._id });
  ok(res, { message: 'Comment deleted' });
});
