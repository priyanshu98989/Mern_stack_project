const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendEmail } = require('./emailService');
const { emitToUser } = require('../sockets');
const logger = require('../config/logger');
const env = require('../config/env');

async function create({
  recipient,
  type,
  title,
  body = '',
  link = '',
  data = {},
  dedupeKey = '',
  email = false,
}) {
  try {
    const user = await User.findById(recipient).select('name email notificationPrefs status');
    if (!user || user.status !== 'active') return null;
    const prefs = user.notificationPrefs || {};

    let notification = null;
    if (prefs.inapp !== false) {
      try {
        notification = await Notification.create({
          recipient,
          type,
          title,
          body,
          link,
          data,
          channels: email ? ['inapp', 'email'] : ['inapp'],
          dedupeKey: dedupeKey || undefined,
        });
      } catch (err) {
        if (err.code === 11000) return null;
        throw err;
      }
      emitToUser(recipient, 'notification', {
        id: String(notification._id),
        type,
        title,
        body,
        link,
        data,
        createdAt: notification.createdAt,
      });
    }

    if (email && prefs.email !== false) {
      const text = `${title}\n\n${body}${link ? `\n\nOpen: ${env.CLIENT_URL}${link}` : ''}`;
      const html = `<p><strong>${title}</strong></p><p>${body}</p>${link ? `<p><a href="${env.CLIENT_URL}${link}">Open CertTrack</a></p>` : ''}`;
      sendEmail(user.email, `[CertTrack] ${title}`, text, html).catch((err) =>
        logger.warn({ err, userId: recipient }, '[notification] email failed')
      );
    }
    return notification;
  } catch (err) {
    logger.warn({ err, recipient }, '[notification] failed');
    return null;
  }
}

module.exports = { create };
