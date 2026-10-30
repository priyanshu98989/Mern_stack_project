const cron = require('node-cron');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const FacultyAssignment = require('../models/FacultyAssignment');
const settingsService = require('../services/settingsService');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

async function runOnce() {
  const settings = await settingsService.getAll();
  const remindDays = Number(settings.slaRemindDays) || 3;
  const escalateDays = Number(settings.slaEscalateDays) || 7;
  const pending = await Certificate.find({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW'] } })
    .populate('student', 'name department')
    .select('title student createdAt status')
    .lean();

  const summary = { checked: pending.length, reminded: 0, escalated: 0 };
  const today = new Date().toISOString().slice(0, 10);

  for (const cert of pending) {
    const ageDays = (Date.now() - new Date(cert.createdAt).getTime()) / 86400000;
    if (ageDays < remindDays) continue;
    const department = cert.student?.department || '';

    const assignments = await FacultyAssignment.find({ student: cert.student?._id })
      .select('faculty')
      .lean();
    let facultyIds = assignments.map((a) => a.faculty);
    if (!facultyIds.length) {
      const faculty = await User.find({ role: 'faculty', department, status: 'active' })
        .select('_id')
        .lean();
      facultyIds = faculty.map((f) => f._id);
    }

    for (const facultyId of facultyIds) {
      const created = await notificationService.create({
        recipient: facultyId,
        type: 'sla_reminder',
        title: 'Certificate pending review',
        body: `"${cert.title}" from ${cert.student?.name || 'a student'} has been pending for ${Math.round(ageDays)} day(s).`,
        link: `/verifier/${cert._id}`,
        data: { certificateId: String(cert._id), ageDays: Math.round(ageDays) },
        dedupeKey: `sla:remind:${cert._id}:${today}:${facultyId}`,
      });
      if (created) summary.reminded += 1;
    }

    if (ageDays >= escalateDays) {
      const hods = await User.find({ role: 'hod', department, status: 'active' })
        .select('_id email')
        .lean();
      for (const hod of hods) {
        const created = await notificationService.create({
          recipient: hod._id,
          type: 'sla_escalation',
          title: 'SLA escalation: certificate overdue',
          body: `"${cert.title}" from ${cert.student?.name || 'a student'} is pending for ${Math.round(ageDays)} day(s).`,
          link: `/verifier/${cert._id}`,
          data: { certificateId: String(cert._id), ageDays: Math.round(ageDays) },
          email: true,
          dedupeKey: `sla:escalate:${cert._id}:${today}:${hod._id}`,
        });
        if (created) summary.escalated += 1;
      }
    }
  }

  logger.info(summary, '[sla] reminder run complete');
  return summary;
}

let task = null;

function start() {
  if (task) return task;
  const expression = process.env.SLA_CRON || '0 9 * * *';
  task = cron.schedule(expression, () => {
    runOnce().catch((err) => logger.error({ err }, '[sla] scheduled run failed'));
  });
  logger.info({ expression }, '[cron] SLA reminder scheduled');
  return task;
}

function stop() {
  if (task) task.stop();
  task = null;
}

module.exports = { start, stop, runOnce };
