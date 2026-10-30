const Setting = require('../models/Setting');
const env = require('../config/env');

const DEFAULTS = {
  institutionName: env.INSTITUTION_NAME,
  requiredCredits: env.REQUIRED_CREDITS,
  slaRemindDays: env.SLA_REMIND_DAYS,
  slaEscalateDays: env.SLA_ESCALATE_DAYS,
  allowSelfRegister: true,
  maintenanceMode: false,
  maxCertificatesPerSemester: env.MAX_CERTIFICATES_PER_SEMESTER,
  aiEnabled: env.AI_ENABLED,
  ocrAutoRun: true,
};

async function getAll() {
  const rows = await Setting.find().lean();
  const values = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value;
  return values;
}

async function get(key, fallback = undefined) {
  const row = await Setting.findOne({ key }).lean();
  if (row) return row.value;
  return fallback !== undefined ? fallback : DEFAULTS[key];
}

async function set(key, value, userId) {
  const row = await Setting.findOneAndUpdate(
    { key },
    { key, value, updatedBy: userId },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return row;
}

module.exports = { DEFAULTS, getAll, get, set };
