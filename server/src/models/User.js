const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');

const savedFilterSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    resource: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    query: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const notificationPrefsSchema = new mongoose.Schema(
  {
    email: { type: Boolean, default: true },
    inapp: { type: Boolean, default: true },
    decisions: { type: Boolean, default: true },
    comments: { type: Boolean, default: true },
    sla: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, select: false },
    role: {
      type: String,
      enum: ['student', 'faculty', 'hod', 'admin'],
      default: 'student',
      index: true,
    },
    department: { type: String, trim: true, default: '', index: true },
    batch: { type: String, trim: true, default: '', index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    profilePhoto: { type: String, default: '' },
    phone: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    googleId: { type: String, index: true, sparse: true },
    savedFilters: { type: [savedFilterSchema], default: [] },
    notificationPrefs: { type: notificationPrefsSchema, default: () => ({}) },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, department: 1 });
userSchema.index({ role: 1, batch: 1 });

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isLocked = function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    role: this.role,
    department: this.department,
    batch: this.batch,
    profilePhoto: this.profilePhoto,
    status: this.status,
    emailVerified: this.emailVerified,
    twoFactorEnabled: this.twoFactorEnabled,
    notificationPrefs: this.notificationPrefs,
    lastLoginAt: this.lastLoginAt,
    createdAt: this.createdAt,
  };
};

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
