const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

function clean(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(clean);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (/password|secret|token|authorization|cookie/i.test(k)) out[k] = '[REDACTED]';
    else out[k] = clean(v);
  }
  return out;
}

async function log({ actor, action, resource, resourceId, diff, req, before, after }) {
  try {
    await AuditLog.create({
      actor: actor?.id || actor?._id || null,
      actorRole: actor?.role || '',
      actorDepartment: actor?.department || '',
      action,
      resource: resource || '',
      resourceId: resourceId ? String(resourceId) : '',
      diff: clean(diff || { before: before || null, after: after || null }),
      ip: req?.ip || '',
      userAgent: req?.get?.('user-agent') || '',
      requestId: req?.id || '',
    });
  } catch (err) {
    logger.warn({ err }, '[audit] failed to write audit log');
  }
}

module.exports = { log, clean };
