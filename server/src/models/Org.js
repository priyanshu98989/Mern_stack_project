const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const batchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    year: { type: Number },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
batchSchema.index({ name: 1, department: 1 }, { unique: true });

module.exports = {
  Department: mongoose.model('Department', departmentSchema),
  Batch: mongoose.model('Batch', batchSchema),
};
