const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  } else {
    transporter = {
      sendMail: async (opts) => {
        if (!env.isTest) {
          if (env.isProd) {
            logger.warn(
              { to: opts.to, subject: opts.subject },
              '[email] production has no SMTP_HOST; email not delivered'
            );
          } else {
            logger.info(
              { to: opts.to, subject: opts.subject, text: opts.text },
              '[email:dev] SMTP not configured; email contents logged instead of sent'
            );
          }
        }
        return { messageId: `dev-${Date.now()}` };
      },
    };
  }
  return transporter;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendEmail(to, subject, text, html, { retries = 3 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const info = await getTransporter().sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html: html || undefined,
      });
      return info;
    } catch (err) {
      lastError = err;
      logger.warn({ err, attempt }, '[email] send failed, will retry');
      if (attempt < retries) await sleep(attempt * 500);
    }
  }
  throw lastError;
}

const queue = [];
let processing = false;

function enqueueEmail(job) {
  queue.push({ ...job, attempts: 0 });
  processQueue();
}

async function processQueue() {
  if (processing || !queue.length) return;
  processing = true;
  while (queue.length) {
    const job = queue.shift();
    try {
      await sendEmail(job.to, job.subject, job.text, job.html);
    } catch (err) {
      job.attempts += 1;
      if (job.attempts < 3) {
        queue.push(job);
      } else {
        logger.error({ err, to: job.to }, '[email] dropped after retries');
      }
    }
  }
  processing = false;
}

module.exports = { sendEmail, enqueueEmail, queueLength: () => queue.length };
