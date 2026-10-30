const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    certificate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Certificate',
      required: true,
      index: true,
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, default: '' },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.index({ certificate: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
