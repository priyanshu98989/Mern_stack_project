const FeatureFlag = require('../models/FeatureFlag');
const { ok } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const auditService = require('../services/auditService');

exports.list = asyncHandler(async (req, res) => {
  const q = req.user.role === 'admin' ? {} : { enabled: true };
  const items = await FeatureFlag.find(q).sort({ key: 1 }).lean();
  ok(res, { items });
});

exports.get = asyncHandler(async (req, res) => {
  const flag = await FeatureFlag.findOne({ key: req.params.key }).lean();
  ok(res, { flag: flag || { key: req.params.key, enabled: false } });
});

exports.upsert = asyncHandler(async (req, res) => {
  const flag = await FeatureFlag.findOneAndUpdate(
    { key: req.params.key },
    {
      key: req.params.key,
      enabled: req.validated.body.enabled,
      description: req.validated.body.description || '',
      updatedBy: req.user.id,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );
  auditService.log({
    actor: req.user,
    action: 'feature_flag.updated',
    resource: 'FeatureFlag',
    resourceId: flag._id,
    diff: { after: { key: flag.key, enabled: flag.enabled } },
    req,
  });
  ok(res, { flag });
});
