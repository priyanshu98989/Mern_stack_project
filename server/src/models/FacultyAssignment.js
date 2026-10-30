const mongoose = require('mongoose');

const facultyAssignmentSchema = new mongoose.Schema(
  {
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

facultyAssignmentSchema.index({ faculty: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('FacultyAssignment', facultyAssignmentSchema);
