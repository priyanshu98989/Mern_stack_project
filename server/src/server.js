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
    const count = await User.countDocuments();
    if (count === 0) {
      const demos = [
        { name: 'CertTrack Admin', email: 'admin@certtrack.local', role: 'admin', password: 'Admin@12345', department: 'Administration' },
        { name: 'Dr. Ramesh Iyer', email: 'hod.cse@certtrack.local', role: 'hod', password: 'Hod@12345', department: 'CSE' },
        { name: 'Dr. Kavita Rao', email: 'faculty1@certtrack.local', role: 'faculty', password: 'Faculty@12345', department: 'CSE' },
        { name: 'Demo Student', email: 'student1@certtrack.local', role: 'student', password: 'Student@12345', department: 'CSE' },
      ];
      for (const d of demos) {
        await User.create({ ...d, emailVerified: true, status: 'active' });
      }
      logger.info('[seed] demo users created');
    }
  } catch (err) {
    logger.warn({ err }, '[seed] auto-seed failed');
  }
  const app = createApp();
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
