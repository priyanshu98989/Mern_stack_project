const mongoose = require('mongoose');

const creditLedgerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      required: true,
      index: true,
    },
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', default: null },
    platformName: { type: String, default: '' },
    semesterKey: { type: String, default: '', index: true },
    type: { type: String, enum: ['earned', 'adjusted', 'reversed'], default: 'earned' },
    credits: { type: Number, required: true },
    ruleVersion: { type: Number, default: null },
    ruleName: { type: String, default: '' },
    breakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    idempotencyKey: { type: String, unique: true, sparse: true },
    note: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

creditLedgerSchema.index({ user: 1, createdAt: -1 });
creditLedgerSchema.index({ user: 1, semesterKey: 1, type: 1 });
creditLedgerSchema.index({ user: 1, platform: 1, type: 1 });
creditLedgerSchema.index(
  { certificate: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: 'earned' } }
);

creditLedgerSchema.pre('findOneAndUpdate', function block(next) {
  next(new Error('CreditLedger is append-only'));
});
creditLedgerSchema.pre('updateOne', function block(next) {
  next(new Error('CreditLedger is append-only'));
});
creditLedgerSchema.pre('deleteOne', function block(next) {
  next(new Error('CreditLedger is append-only'));
});
creditLedgerSchema.pre('deleteMany', function block(next) {
  next(new Error('CreditLedger is append-only'));
});

const CreditLedger = mongoose.model('CreditLedger', creditLedgerSchema);
module.exports = CreditLedger;
