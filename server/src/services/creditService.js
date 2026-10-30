const mongoose = require('mongoose');
const CreditRule = require('../models/CreditRule');
const CreditLedger = require('../models/CreditLedger');
const Certificate = require('../models/Certificate');

function platformIdOf(cert) {
  return cert.platform ? String(cert.platform._id || cert.platform) : null;
}

async function findApplicableRule(cert, at = new Date()) {
  const pid = platformIdOf(cert);
  const rules = await CreditRule.find({
    isActive: true,
    effectiveFrom: { $lte: at },
    $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: at } }],
  }).lean();

  const matching = rules.filter((rule) => {
    if (rule.platform && String(rule.platform) !== pid) return false;
    const criteria = rule.criteria || {};
    if ((cert.durationWeeks || 0) < (criteria.minDurationWeeks || 0)) return false;
    if ((cert.durationHours || 0) < (criteria.minDurationHours || 0)) return false;
    if ((cert.score || 0) < (criteria.minScore || 0)) return false;
    if (
      Array.isArray(criteria.grades) &&
      criteria.grades.length &&
      !criteria.grades.includes(cert.grade)
    )
      return false;
    return true;
  });

  matching.sort((a, b) => {
    const specificityA = a.platform ? 1 : 0;
    const specificityB = b.platform ? 1 : 0;
    if (specificityB !== specificityA) return specificityB - specificityA;
    if (b.credits !== a.credits) return b.credits - a.credits;
    if ((b.version || 1) !== (a.version || 1)) return (b.version || 1) - (a.version || 1);
    return new Date(b.effectiveFrom || b.createdAt) - new Date(a.effectiveFrom || a.createdAt);
  });

  return matching[0] || null;
}

async function computeCredits(cert, { at = new Date() } = {}) {
  const rule = await findApplicableRule(cert, at);
  if (!rule) {
    return {
      credits: 0,
      rule: null,
      breakdown: {
        reason: 'No applicable credit rule was effective at the approval date.',
        inputs: {
          platform: cert.platformName || platformIdOf(cert),
          durationWeeks: cert.durationWeeks || 0,
          durationHours: cert.durationHours || 0,
          score: cert.score || 0,
          grade: cert.grade || '',
        },
        finalCredits: 0,
      },
    };
  }

  const userId = cert.student._id || cert.student;
  const pid = platformIdOf(cert);
  const semesterKey = cert.semesterKey || cert.semester || '';

  const [platformAgg, semesterAgg] = await Promise.all([
    rule.perPlatformCap != null && pid
      ? CreditLedger.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(String(userId)),
              platform: new mongoose.Types.ObjectId(pid),
              type: 'earned',
            },
          },
          { $group: { _id: null, total: { $sum: '$credits' } } },
        ])
      : Promise.resolve([]),
    rule.perSemesterCap != null && semesterKey
      ? CreditLedger.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(String(userId)),
              semesterKey,
              type: 'earned',
            },
          },
          { $group: { _id: null, total: { $sum: '$credits' } } },
        ])
      : Promise.resolve([]),
  ]);

  const platformUsed = (platformAgg[0] && platformAgg[0].total) || 0;
  const semesterUsed = (semesterAgg[0] && semesterAgg[0].total) || 0;
  const caps = {
    perPlatformCap: rule.perPlatformCap,
    perSemesterCap: rule.perSemesterCap,
    platformUsed,
    semesterUsed,
    platformRemaining:
      rule.perPlatformCap != null ? Math.max(0, rule.perPlatformCap - platformUsed) : null,
    semesterRemaining:
      rule.perSemesterCap != null ? Math.max(0, rule.perSemesterCap - semesterUsed) : null,
    platformLimited: false,
    semesterLimited: false,
  };

  let credits = rule.credits;
  if (rule.perPlatformCap != null && pid) {
    if (platformUsed + credits > rule.perPlatformCap) {
      credits = Math.max(0, rule.perPlatformCap - platformUsed);
      caps.platformLimited = true;
    }
  }
  if (rule.perSemesterCap != null && semesterKey) {
    if (semesterUsed + credits > rule.perSemesterCap) {
      credits = Math.max(0, rule.perSemesterCap - semesterUsed);
      caps.semesterLimited = true;
    }
  }

  const reasons = [];
  if (credits === rule.credits)
    reasons.push(`Matched rule "${rule.name}" v${rule.version}: ${rule.credits} base credit(s).`);
  if (caps.platformLimited) reasons.push(`Platform cap limited the award to ${credits} credit(s).`);
  if (caps.semesterLimited) reasons.push(`Semester cap limited the award to ${credits} credit(s).`);
  if (!semesterKey && rule.perSemesterCap != null)
    reasons.push('No semester was supplied, so the semester cap was not applied.');

  const breakdown = {
    ruleId: String(rule._id),
    ruleKey: rule.ruleKey,
    ruleName: rule.name,
    ruleVersion: rule.version,
    baseCredits: rule.credits,
    caps,
    inputs: {
      platform: cert.platformName || String(rule.platform || ''),
      durationWeeks: cert.durationWeeks || 0,
      durationHours: cert.durationHours || 0,
      score: cert.score || 0,
      grade: cert.grade || '',
      semesterKey,
    },
    finalCredits: credits,
    reasons,
    evaluatedAt: at.toISOString(),
  };

  return { credits, rule, breakdown };
}

async function awardCredits(cert, awardedBy) {
  const existing = await CreditLedger.findOne({ certificate: cert._id, type: 'earned' });
  if (existing) {
    return {
      credits: existing.credits,
      ledger: existing,
      breakdown: existing.breakdown,
      ruleVersion: existing.ruleVersion,
      ruleName: existing.ruleName,
      skipped: true,
    };
  }

  const { credits, rule, breakdown } = await computeCredits(cert, {
    at: cert.verifiedAt ? new Date(cert.verifiedAt) : new Date(),
  });

  try {
    const ledger = await CreditLedger.create({
      user: cert.student._id || cert.student,
      certificate: cert._id,
      platform: cert.platform || null,
      platformName: cert.platformName || (rule && rule.platform ? '' : ''),
      semesterKey: cert.semesterKey || cert.semester || '',
      type: 'earned',
      credits,
      ruleVersion: rule ? rule.version : null,
      ruleName: rule ? rule.name : '',
      breakdown,
      idempotencyKey: `cert:${cert._id}`,
      createdBy: awardedBy,
    });
    return {
      credits,
      ledger,
      breakdown,
      ruleVersion: rule ? rule.version : null,
      ruleName: rule ? rule.name : '',
      skipped: false,
    };
  } catch (err) {
    if (err.code === 11000) {
      const ledger = await CreditLedger.findOne({ certificate: cert._id, type: 'earned' });
      return {
        credits: ledger ? ledger.credits : 0,
        ledger,
        breakdown: ledger ? ledger.breakdown : breakdown,
        ruleVersion: ledger ? ledger.ruleVersion : null,
        ruleName: ledger ? ledger.ruleName : '',
        skipped: true,
      };
    }
    throw err;
  }
}

async function reverseCredits(cert, by, note = 'Approval revoked by override') {
  const earned = await CreditLedger.findOne({ certificate: cert._id, type: 'earned' });
  if (!earned) return null;
  const already = await CreditLedger.findOne({ certificate: cert._id, type: 'reversed' });
  if (already) return already;
  return CreditLedger.create({
    user: cert.student._id || cert.student,
    certificate: cert._id,
    platform: cert.platform || null,
    platformName: cert.platformName || '',
    semesterKey: cert.semesterKey || cert.semester || '',
    type: 'reversed',
    credits: -Math.abs(earned.credits),
    ruleVersion: earned.ruleVersion,
    ruleName: earned.ruleName,
    breakdown: { reason: note, originalLedgerId: String(earned._id) },
    idempotencyKey: `cert:${cert._id}:reversed`,
    note,
    createdBy: by,
  });
}

async function adjustCredits({ userId, certificateId, credits, note, by }) {
  return CreditLedger.create({
    user: userId,
    certificate: certificateId,
    type: 'adjusted',
    credits,
    note,
    breakdown: { reason: note, adjustedBy: String(by) },
    idempotencyKey: `adjust:${certificateId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    createdBy: by,
  });
}

async function getUserCredits(userId) {
  const agg = await CreditLedger.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(String(userId)) } },
    { $group: { _id: null, total: { $sum: '$credits' } } },
  ]);
  return (agg[0] && agg[0].total) || 0;
}

async function getSummary(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  const [bySemester, byPlatform, byType] = await Promise.all([
    CreditLedger.aggregate([
      { $match: { user: uid } },
      { $group: { _id: '$semesterKey', credits: { $sum: '$credits' } } },
      { $sort: { _id: 1 } },
    ]),
    CreditLedger.aggregate([
      { $match: { user: uid } },
      { $group: { _id: { $ifNull: ['$platformName', 'Unknown'] }, credits: { $sum: '$credits' } } },
      { $sort: { credits: -1 } },
    ]),
    CreditLedger.aggregate([
      { $match: { user: uid } },
      { $group: { _id: '$type', credits: { $sum: '$credits' }, count: { $sum: 1 } } },
    ]),
  ]);
  const total = byType.reduce((sum, row) => sum + row.credits, 0);
  return {
    total,
    bySemester: bySemester.map((r) => ({ semester: r._id || 'Unassigned', credits: r.credits })),
    byPlatform: byPlatform.map((r) => ({ platform: r._id, credits: r.credits })),
    byType: byType.map((r) => ({ type: r._id, credits: r.credits, count: r.count })),
  };
}

async function getLedger(userId, { page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    CreditLedger.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('certificate', 'title platformName semester status verifiedAt')
      .lean(),
    CreditLedger.countDocuments({ user: userId }),
  ]);
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

async function getBreakdown(certificateId, user) {
  const cert = await Certificate.findById(certificateId);
  if (!cert) return null;
  return {
    certificateId: String(cert._id),
    title: cert.title,
    status: cert.status,
    creditsAwarded: cert.creditsAwarded,
    ruleVersion: cert.creditRuleVersion,
    breakdown: cert.creditBreakdown,
    ledger: await CreditLedger.findOne({ certificate: cert._id }).sort({ createdAt: 1 }).lean(),
    user: String(user || cert.student),
  };
}

async function listRules({ active } = {}) {
  const q = {};
  if (active !== undefined) q.isActive = active;
  return CreditRule.find(q).populate('platform', 'name').sort({ ruleKey: 1, version: -1 }).lean();
}

async function createRuleVersion(input, createdBy) {
  const name = input.name;
  const ruleKey =
    input.ruleKey ||
    String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  const latest = await CreditRule.findOne({ ruleKey }).sort({ version: -1 });
  await CreditRule.updateMany({ ruleKey, isActive: true }, { isActive: false });
  const rule = await CreditRule.create({
    ...input,
    ruleKey,
    version: latest ? latest.version + 1 : 1,
    supersedes: latest ? latest._id : null,
    isActive: input.isActive !== undefined ? input.isActive : true,
    createdBy,
  });
  return rule;
}

async function updateRuleVersion(id, input, createdBy) {
  const existing = await CreditRule.findById(id);
  if (!existing) return null;
  if (input.effectiveFrom === undefined) input.effectiveFrom = new Date();
  return createRuleVersion(
    {
      ...existing.toObject(),
      ...input,
      _id: undefined,
      ruleKey: existing.ruleKey,
      name: input.name || existing.name,
      version: undefined,
      supersedes: undefined,
      isActive: true,
    },
    createdBy
  );
}

module.exports = {
  findApplicableRule,
  computeCredits,
  awardCredits,
  reverseCredits,
  adjustCredits,
  getUserCredits,
  getSummary,
  getLedger,
  getBreakdown,
  listRules,
  createRuleVersion,
  updateRuleVersion,
};
