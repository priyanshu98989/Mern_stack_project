const mongoose = require('mongoose');

const creditRuleSchema = new mongoose.Schema(
  {
    ruleKey: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', default: null },
    criteria: {
      minDurationWeeks: { type: Number, default: 0, min: 0 },
      minDurationHours: { type: Number, default: 0, min: 0 },
      minScore: { type: Number, default: 0, min: 0 },
      grades: { type: [String], default: [] },
    },
    credits: { type: Number, required: true, min: 0, max: 50 },
    perSemesterCap: { type: Number, default: null, min: 0 },
    perPlatformCap: { type: Number, default: null, min: 0 },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveUntil: { type: Date, default: null },
    version: { type: Number, default: 1, min: 1 },
    isActive: { type: Boolean, default: true, index: true },
    supersedes: { type: mongoose.Schema.Types.ObjectId, ref: 'CreditRule', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creditRuleSchema.index({ ruleKey: 1, version: 1 }, { unique: true });
creditRuleSchema.index({ isActive: 1, effectiveFrom: 1, effectiveUntil: 1 });
creditRuleSchema.index({ platform: 1, isActive: 1 });

const CreditRule = mongoose.model('CreditRule', creditRuleSchema);
module.exports = CreditRule;
