const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema(
  {
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      required: true,
      index: true,
    },
    from: { type: String, required: true },
    to: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, default: '' },
    remarks: { type: String, default: '' },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

statusHistorySchema.index({ certificate: 1, at: -1 });

statusHistorySchema.pre('findOneAndUpdate', function block(next) {
  next(new Error('StatusHistory is append-only'));
});
statusHistorySchema.pre('updateOne', function block(next) {
  next(new Error('StatusHistory is append-only'));
});
statusHistorySchema.pre('deleteOne', function block(next) {
  next(new Error('StatusHistory is append-only'));
});

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
