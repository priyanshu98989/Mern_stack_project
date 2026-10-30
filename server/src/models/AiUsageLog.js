const mongoose = require('mongoose');

const aiUsageLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true },
    model: { type: String, default: '' },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    cached: { type: Boolean, default: false },
    status: { type: String, default: 'ok' },
    error: { type: String, default: '' },
    fileHash: { type: String, default: '' },
  },
  { timestamps: true }
);

aiUsageLogSchema.index({ user: 1, createdAt: -1 });
aiUsageLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AiUsageLog', aiUsageLogSchema);
