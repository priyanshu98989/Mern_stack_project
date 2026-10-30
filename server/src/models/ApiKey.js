const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    scopes: { type: [String], default: ['read'] },
    rateLimit: { type: Number, default: 100 },
    lastUsed: { type: Date },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

apiKeySchema.statics.generate = function generate() {
  const raw = `ct_${crypto.randomBytes(24).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12);
  return { raw, hash, prefix };
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
