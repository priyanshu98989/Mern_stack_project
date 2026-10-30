const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, default: '' },
    actorDepartment: { type: String, default: '' },
    action: { type: String, required: true, index: true },
    resource: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    diff: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    requestId: { type: String, default: '' },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ actorDepartment: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });

auditLogSchema.pre('findOneAndUpdate', function block(next) {
  next(new Error('AuditLog is append-only'));
});
auditLogSchema.pre('updateOne', function block(next) {
  next(new Error('AuditLog is append-only'));
});
auditLogSchema.pre('deleteOne', function block(next) {
  next(new Error('AuditLog is append-only'));
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
