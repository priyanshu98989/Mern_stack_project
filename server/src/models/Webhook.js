const mongoose = require('mongoose');
const crypto = require('crypto');

const webhookSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    url: { type: String, required: true, trim: true },
    secret: { type: String, required: true },
    events: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    lastDelivery: { type: Date },
    failureCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

webhookSchema.pre('validate', function preValidate(next) {
  if (!this.secret) this.secret = crypto.randomBytes(24).toString('hex');
  next();
});

module.exports = mongoose.model('Webhook', webhookSchema);
