const mongoose = require('mongoose');

const idempotencyKeySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    key: { type: String, required: true },
    route: { type: String, required: true },
    requestHash: { type: String, required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
    responseData: { type: mongoose.Schema.Types.Mixed, default: null },
    statusCode: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false }
);

idempotencyKeySchema.index({ user: 1, key: 1, route: 1 }, { unique: true });
idempotencyKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('IdempotencyKey', idempotencyKeySchema);
