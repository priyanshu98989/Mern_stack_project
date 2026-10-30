const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    publicId: { type: String, default: '' },
    filename: { type: String, default: '' },
    mimetype: { type: String, default: '' },
    size: { type: Number, default: 0 },
    hash: { type: String, default: '' },
    uploadedAt: { type: Date },
  },
  { _id: false }
);

const externalVerificationSchema = new mongoose.Schema(
  {
    url: { type: String, default: '' },
    checkedAt: { type: Date },
    checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    result: {
      type: String,
      enum: ['not_checked', 'opened', 'link_valid', 'link_invalid', 'manual'],
      default: 'not_checked',
    },
    note: { type: String, default: '' },
  },
  { _id: false }
);

const certificateSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 220 },
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', index: true },
    platformName: { type: String, trim: true, default: '' },
    institute: { type: String, trim: true, default: '' },
    instructor: { type: String, trim: true, default: '' },
    durationWeeks: { type: Number, min: 0, max: 520 },
    durationHours: { type: Number, min: 0, max: 5000 },
    startDate: { type: Date },
    endDate: { type: Date },
    grade: { type: String, trim: true, default: '' },
    score: { type: Number, min: 0, max: 100 },
    certificateId: { type: String, trim: true, default: '' },
    certificateIdNormalized: { type: String, trim: true, default: '', index: true },
    certificateUrl: { type: String, trim: true, default: '' },
    skillTags: { type: [String], default: [] },
    semester: { type: String, trim: true, default: '' },
    semesterKey: { type: String, trim: true, default: '', index: true },
    departmentSnapshot: { type: String, trim: true, default: '' },
    batchSnapshot: { type: String, trim: true, default: '' },

    proof: { type: proofSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES'],
      default: 'DRAFT',
      index: true,
    },
    remarks: { type: String, default: '' },
    submittedAt: { type: Date },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },

    trustScore: { type: Number, default: 100, min: 0, max: 100 },
    trustReasons: { type: [String], default: [] },
    duplicateFlags: { type: [String], default: [] },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate', default: null },
    externalVerification: { type: externalVerificationSchema, default: () => ({}) },

    ocrSuggestions: { type: mongoose.Schema.Types.Mixed, default: null },
    aiAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },

    creditsAwarded: { type: Number, default: 0, min: 0 },
    creditRuleVersion: { type: Number, default: null },
    creditBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },

    verificationId: { type: String, unique: true, sparse: true, index: true },
    qrCodeDataUrl: { type: String, default: '' },
    signature: { type: String, default: '' },
    signatureKeyId: { type: String, default: '' },
    signedPayload: { type: mongoose.Schema.Types.Mixed, default: null },

    version: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

certificateSchema.index({ student: 1, status: 1 });
certificateSchema.index({ status: 1, createdAt: -1 });
certificateSchema.index({ 'proof.hash': 1 });
certificateSchema.index({ student: 1, createdAt: -1 });
certificateSchema.index({ student: 1, semesterKey: 1 });
certificateSchema.index({ platform: 1, status: 1 });
certificateSchema.index({ title: 'text', skillTags: 'text', institute: 'text' });

certificateSchema.pre('validate', function preValidate(next) {
  this.certificateIdNormalized = this.certificateId
    ? String(this.certificateId).replace(/\s+/g, '').toUpperCase()
    : '';
  this.semesterKey = this.semester
    ? String(this.semester).trim().toUpperCase().replace(/\s+/g, '-')
    : '';
  next();
});

const Certificate = mongoose.model('Certificate', certificateSchema);
module.exports = Certificate;
