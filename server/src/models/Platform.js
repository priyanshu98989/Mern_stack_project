const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    website: { type: String, trim: true, default: '' },
    verificationUrlTemplate: { type: String, trim: true, default: '' },
    domains: { type: [String], default: [] },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Platform', platformSchema);
