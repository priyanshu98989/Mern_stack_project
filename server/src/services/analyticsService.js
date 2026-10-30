const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const CreditLedger = require('../models/CreditLedger');
const User = require('../models/User');
const { getScopedStudentIds } = require('../middleware/ownership');

function oid(id) {
  return new mongoose.Types.ObjectId(String(id));
}

async function studentAnalytics(userId, { requiredCredits = 20 } = {}) {
  const uid = oid(userId);
  const [
    timeline,
    platformSplit,
    skills,
    totalAgg,
    statusCounts,
    semesterAgg,
    recent,
    approvedCount,
  ] = await Promise.all([
    CreditLedger.aggregate([
      { $match: { user: uid } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          credits: { $sum: '$credits' },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 24 },
    ]),
    CreditLedger.aggregate([
      { $match: { user: uid, type: 'earned' } },
      {
        $group: {
          _id: { $ifNull: ['$platformName', 'Unknown'] },
          count: { $sum: 1 },
          credits: { $sum: '$credits' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    Certificate.aggregate([
      { $match: { student: uid, status: 'APPROVED' } },
      { $unwind: '$skillTags' },
      { $group: { _id: '$skillTags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    CreditLedger.aggregate([
      { $match: { user: uid } },
      { $group: { _id: null, total: { $sum: '$credits' } } },
    ]),
    Certificate.aggregate([
      { $match: { student: uid } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CreditLedger.aggregate([
      { $match: { user: uid, type: 'earned' } },
      { $group: { _id: '$semesterKey', credits: { $sum: '$credits' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Certificate.find({ student: uid })
      .sort({ createdAt: -1 })
      .limit(6)
      .select('title platformName status creditsAwarded createdAt verifiedAt semesterKey')
      .lean(),
    Certificate.countDocuments({ student: uid, status: 'APPROVED' }),
  ]);

  const total = (totalAgg[0] && totalAgg[0].total) || 0;
  return {
    creditsTimeline: timeline.map((t) => ({ month: t._id, credits: t.credits })),
    platformSplit: platformSplit.map((p) => ({ name: p._id, count: p.count, credits: p.credits })),
    skills: skills.map((s) => ({ skill: s._id, count: s.count })),
    statusCounts: statusCounts.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    semesterCredits: semesterAgg.map((s) => ({
      semester: s._id || 'Unassigned',
      credits: s.credits,
      certificates: s.count,
    })),
    recentCertificates: recent,
    approvedCertificates: approvedCount,
    progress: {
      earned: total,
      required: requiredCredits,
      percent: requiredCredits ? Math.min(100, Math.round((total / requiredCredits) * 100)) : 0,
    },
  };
}

async function facultyAnalytics(facultyId) {
  const ids = await getScopedStudentIds({ id: facultyId, role: 'faculty' });
  const studentIds = ids.map(oid);
  if (!studentIds.length) {
    return {
      assignedStudents: 0,
      pending: { count: 0, avgAgeDays: 0, buckets: [] },
      decisions: { approved: 0, rejected: 0, needsChanges: 0 },
      approvalRate: 0,
      avgTurnaroundDays: 0,
      monthly: [],
      queue: [],
    };
  }

  const [pendingAgg, decisionsAgg, queue, monthly] = await Promise.all([
    Certificate.aggregate([
      { $match: { student: { $in: studentIds }, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } } },
      {
        $project: {
          ageDays: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] },
        },
      },
      {
        $bucket: {
          groupBy: '$ageDays',
          boundaries: [0, 1, 3, 7, 14, 3650],
          default: 'older',
          output: { count: { $sum: 1 } },
        },
      },
    ]),
    Certificate.aggregate([
      {
        $match: {
          student: { $in: studentIds },
          status: { $in: ['APPROVED', 'REJECTED', 'NEEDS_CHANGES'] },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgTurnaroundDays: {
            $avg: {
              $divide: [
                { $subtract: [{ $ifNull: ['$verifiedAt', '$updatedAt'] }, '$createdAt'] },
                86400000,
              ],
            },
          },
        },
      },
    ]),
    Certificate.find({
      student: { $in: studentIds },
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] },
    })
      .sort({ createdAt: 1 })
      .limit(10)
      .populate('student', 'name email')
      .select('title student trustScore status createdAt')
      .lean(),
    Certificate.aggregate([
      { $match: { student: { $in: studentIds }, status: { $in: ['APPROVED', 'REJECTED'] } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$updatedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
  ]);

  const pendingCount = pendingAgg.reduce((sum, b) => sum + b.count, 0);
  const pendingRows = await Certificate.aggregate([
    { $match: { student: { $in: studentIds }, status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } } },
    {
      $group: {
        _id: null,
        avgAgeDays: { $avg: { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] } },
      },
    },
  ]);
  const decisionMap = decisionsAgg.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {});
  const totalDecided = (decisionMap.APPROVED || 0) + (decisionMap.REJECTED || 0);
  const approvedRow = decisionsAgg.find((r) => r._id === 'APPROVED');
  const rejectedRow = decisionsAgg.find((r) => r._id === 'REJECTED');

  const bucketLabels = ['0-1 day', '1-3 days', '3-7 days', '7-14 days', '14+ days'];
  return {
    assignedStudents: ids.length,
    pending: {
      count: pendingCount,
      avgAgeDays: Number(((pendingRows[0] && pendingRows[0].avgAgeDays) || 0).toFixed(1)),
      buckets: pendingAgg.map((b, i) => ({ label: bucketLabels[i] || 'older', count: b.count })),
    },
    decisions: {
      approved: decisionMap.APPROVED || 0,
      rejected: decisionMap.REJECTED || 0,
      needsChanges: decisionMap.NEEDS_CHANGES || 0,
    },
    approvalRate: totalDecided ? Math.round(((decisionMap.APPROVED || 0) / totalDecided) * 100) : 0,
    avgTurnaroundDays: Number(
      (approvedRow?.avgTurnaroundDays || rejectedRow?.avgTurnaroundDays || 0).toFixed(1)
    ),
    monthly: monthly.map((m) => ({ month: m._id, decisions: m.count })),
    queue: queue.map((c) => ({
      id: String(c._id),
      title: c.title,
      student: c.student?.name || '',
      status: c.status,
      trustScore: c.trustScore,
      ageDays: Math.round((Date.now() - new Date(c.createdAt).getTime()) / 86400000),
    })),
  };
}

async function departmentAnalytics(department) {
  const students = await User.find({ role: 'student', department }).select('_id name batch').lean();
  const ids = students.map((s) => s._id);
  const idObjects = ids.map(oid);

  const [summary, topCourses, topSkills, leaderboard, monthly, batchComparison] = await Promise.all(
    [
      Certificate.aggregate([
        { $match: { student: { $in: idObjects } } },
        {
          $group: {
            _id: null,
            totalCertificates: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
            pending: {
              $sum: { $cond: [{ $in: ['$status', ['SUBMITTED', 'UNDER_REVIEW']] }, 1, 0] },
            },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
            credits: { $sum: '$creditsAwarded' },
          },
        },
      ]),
      Certificate.aggregate([
        { $match: { student: { $in: idObjects }, status: 'APPROVED' } },
        { $group: { _id: '$title', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Certificate.aggregate([
        { $match: { student: { $in: idObjects }, status: 'APPROVED' } },
        { $unwind: '$skillTags' },
        { $group: { _id: '$skillTags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      CreditLedger.aggregate([
        { $match: { user: { $in: idObjects }, type: 'earned' } },
        { $group: { _id: '$user', credits: { $sum: '$credits' } } },
        { $sort: { credits: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: '$user' },
        { $project: { name: '$user.name', batch: '$user.batch', credits: 1 } },
      ]),
      Certificate.aggregate([
        { $match: { student: { $in: idObjects } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 24 },
      ]),
      Certificate.aggregate([
        { $match: { student: { $in: idObjects }, status: 'APPROVED' } },
        {
          $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentDoc' },
        },
        { $unwind: '$studentDoc' },
        {
          $group: {
            _id: '$studentDoc.batch',
            certificates: { $sum: 1 },
            credits: { $sum: '$creditsAwarded' },
          },
        },
        { $sort: { credits: -1 } },
      ]),
    ]
  );

  return {
    department,
    studentCount: students.length,
    summary: summary[0] || {
      totalCertificates: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      credits: 0,
    },
    topCourses: topCourses.map((t) => ({ course: t._id, count: t.count })),
    topSkills: topSkills.map((t) => ({ skill: t._id, count: t.count })),
    leaderboard: leaderboard.map((l) => ({ name: l.name, batch: l.batch, credits: l.credits })),
    monthlyTrends: monthly.map((m) => ({ month: m._id, certificates: m.count })),
    batchComparison: batchComparison.map((b) => ({
      batch: b._id || 'Unassigned',
      certificates: b.certificates,
      credits: b.credits,
    })),
  };
}

async function leaderboard({ scopeIds = null, limit = 10 } = {}) {
  const match = { type: 'earned' };
  if (scopeIds) match.user = { $in: scopeIds.map(oid) };
  return CreditLedger.aggregate([
    { $match: match },
    { $group: { _id: '$user', credits: { $sum: '$credits' }, certificates: { $sum: 1 } } },
    { $sort: { credits: -1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: '$user.name',
        department: '$user.department',
        batch: '$user.batch',
        credits: 1,
        certificates: 1,
      },
    },
  ]);
}

async function trends({ scopeIds = null } = {}) {
  const match = scopeIds ? { student: { $in: scopeIds.map(oid) } } : {};
  return Certificate.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
        certificates: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 24 },
  ]);
}

async function overview() {
  const [users, certSummary, deptComparison, topCourses, topSkills, recentAudit] =
    await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Certificate.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
            pending: {
              $sum: { $cond: [{ $in: ['$status', ['SUBMITTED', 'UNDER_REVIEW']] }, 1, 0] },
            },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'REJECTED'] }, 1, 0] } },
            credits: { $sum: '$creditsAwarded' },
          },
        },
      ]),
      Certificate.aggregate([
        { $match: { status: 'APPROVED' } },
        {
          $lookup: { from: 'users', localField: 'student', foreignField: '_id', as: 'studentDoc' },
        },
        { $unwind: '$studentDoc' },
        {
          $group: {
            _id: '$studentDoc.department',
            certificates: { $sum: 1 },
            credits: { $sum: '$creditsAwarded' },
          },
        },
        { $sort: { credits: -1 } },
      ]),
      Certificate.aggregate([
        { $match: { status: 'APPROVED' } },
        { $group: { _id: '$title', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Certificate.aggregate([
        { $match: { status: 'APPROVED' } },
        { $unwind: '$skillTags' },
        { $group: { _id: '$skillTags', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      require('../models/AuditLog')
        .find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('actor', 'name role')
        .lean(),
    ]);

  return {
    users: users.reduce((acc, row) => ({ ...acc, [row._id]: row.count }), {}),
    certificates: certSummary[0] || { total: 0, approved: 0, pending: 0, rejected: 0, credits: 0 },
    departments: deptComparison.map((d) => ({
      department: d._id || 'Unassigned',
      certificates: d.certificates,
      credits: d.credits,
    })),
    topCourses: topCourses.map((t) => ({ course: t._id, count: t.count })),
    topSkills: topSkills.map((t) => ({ skill: t._id, count: t.count })),
    recentAudit: recentAudit.map((a) => ({
      action: a.action,
      actor: a.actor?.name || 'system',
      resource: a.resource,
      createdAt: a.createdAt,
    })),
  };
}

module.exports = {
  studentAnalytics,
  facultyAnalytics,
  departmentAnalytics,
  leaderboard,
  trends,
  overview,
};
