const FeatureFlag = require('../models/FeatureFlag');
const ApiError = require('../utils/ApiError');

function requireFeature(key, { defaultValue = false } = {}) {
  return async (req, res, next) => {
    try {
      const flag = await FeatureFlag.findOne({ key });
      const enabled = flag ? flag.enabled : defaultValue;
      if (!enabled)
        throw new ApiError(503, 'FEATURE_DISABLED', 'This feature is currently disabled');
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireFeature };
