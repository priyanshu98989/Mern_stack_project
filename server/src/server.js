const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { createApp } = require('./app');
const { connectDB, disconnectDB } = require('./config/db');
const { setIO } = require('./sockets');
const env = require('./config/env');
const logger = require('./config/logger');
const slaReminder = require('./jobs/slaReminder');

async function start() {
  await connectDB();
  // Auto-seed demo users if DB is empty (for fresh deployments)
  try {
    const User = require('./models/User');
    const Platform = require('./models/Platform');
    const pCount = await Platform.countDocuments();
    if (pCount === 0) {
      const PLATFORMS = [
        { name: 'NPTEL', slug: 'nptel', domains: ['nptel.ac.in'], website: 'https://nptel.ac.in' },
        { name: 'Coursera', slug: 'coursera', domains: ['coursera.org'], website: 'https://coursera.org' },
        { name: 'Udemy', slug: 'udemy', domains: ['udemy.com'], website: 'https://udemy.com' },
        { name: 'edX', slug: 'edx', domains: ['edx.org'], website: 'https://edx.org' },
        { name: 'Swayam', slug: 'swayam', domains: ['swayam.gov.in'], website: 'https://swayam.gov.in' },
        { name: 'Google', slug: 'google', domains: ['google.com', 'cloud.google.com'], website: 'https://grow.google' },
        { name: 'AWS', slug: 'aws', domains: ['aws.amazon.com'], website: 'https://aws.amazon.com' },
        { name: 'IBM', slug: 'ibm', domains: ['ibm.com'], website: 'https://ibm.com' },
      ];
      await Platform.insertMany(PLATFORMS);
      logger.info('[seed] platforms created');
    }
    const demos = [
      { name: 'CertTrack Admin', email: 'admin@certtrack.local', role: 'admin', password: 'Admin@12345', department: 'Administration' },
      { name: 'Dr. Ramesh Iyer', email: 'hod.cse@certtrack.local', role: 'hod', password: 'Hod@12345', department: 'CSE' },
      { name: 'Dr. Kavita Rao', email: 'faculty1@certtrack.local', role: 'faculty', password: 'Faculty@12345', department: 'CSE' },
      { name: 'Demo Student', email: 'student1@certtrack.local', role: 'student', password: 'Student@12345', department: 'CSE' },
    ];
    for (const d of demos) {
      let u = await User.findOne({ email: d.email }).select('+password');
      if (!u) {
        await User.create({ ...d, emailVerified: true, status: 'active' });
      } else {
        u.password = d.password;
        u.failedLoginAttempts = 0;
        u.lockUntil = null;
        u.status = 'active';
        u.emailVerified = true;
        await u.save();
      }
    }
    logger.info('[seed] demo users upserted');
  } catch (err) {
    logger.warn({ err }, '[seed] auto-seed failed');
  }
  // Fix QR codes pointing to localhost (regenerate with correct CLIENT_URL)
  try {
    const Certificate = require('./models/Certificate');
    const { makeVerificationQr } = require('./services/qrService');
    const certs = await Certificate.find({ qrCodeDataUrl: /localhost/ });
    for (const cert of certs) {
      cert.qrCodeDataUrl = await makeVerificationQr(cert.verificationId);
      await cert.save();
    }
    if (certs.length) logger.info(`[qr] regenerated ${certs.length} QR codes`);
  } catch (err) {
    logger.warn({ err }, '[qr] regeneration failed');
  }
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
    path: '/socket.io',
  });
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer /, '');
      if (!token) return next(new Error('UNAUTHORIZED'));
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
      socket.user = payload;
      return next();
    } catch (err) {
      return next(new Error('UNAUTHORIZED'));
    }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role) socket.join(`role:${socket.user.role}`);
    socket.emit('connected', { userId: socket.user.id, role: socket.user.role });
  });
  setIO(io);

  if (env.ENABLE_CRON) slaReminder.start();

  await new Promise((resolve) => server.listen(env.PORT, resolve));
  logger.info({ port: env.PORT, env: env.NODE_ENV }, '[server] CertTrack API started');

  let closing = false;
  const shutdown = async (signal) => {
    if (closing) return;
    closing = true;
    logger.info({ signal }, '[server] shutting down');
    slaReminder.stop();
    io.close();
    server.close(async () => {
      await disconnectDB().catch(() => {});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, '[server] failed to start');
  process.exit(1);
});
