const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { generalLimiter } = require('./middleware/rateLimiter');
const requestId = require('./middleware/requestId');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');
const { isConnected } = require('./config/db');
const env = require('./config/env');
const logger = require('./config/logger');
const cryptoService = require('./services/cryptoService');
const openapi = require('./docs/openapi');

const authRoutes = require('./routes/authRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const commentRoutes = require('./routes/commentRoutes');
const creditRoutes = require('./routes/creditRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const auditRoutes = require('./routes/auditRoutes');
const featureFlagRoutes = require('./routes/featureFlagRoutes');
const ocrRoutes = require('./routes/ocrRoutes');
const aiRoutes = require('./routes/aiRoutes');
const reportRoutes = require('./routes/reportRoutes');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);
  app.use(requestId);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        const allowed = [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://mern-stack-project-blush.vercel.app',
          ...(env.CORS_ORIGINS || []),
        ];
        if (!origin || allowed.includes(origin)) return callback(null, true);
        return callback(new ApiError(403, 'CORS_FORBIDDEN', `Origin ${origin} is not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-csrf-token',
        'x-request-id',
        'Idempotency-Key',
      ],
      exposedHeaders: ['x-request-id', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(hpp());
  if (!env.isTest) app.use(morgan(':method :url :status :response-time ms - :req[x-request-id]'));
  app.use(generalLimiter);

  const health = (req, res) => {
    const db = isConnected();
    const status = db ? 'ok' : 'degraded';
    res.status(db ? 200 : 503).json({
      success: db,
      data: {
        status,
        db: db ? 'connected' : 'disconnected',
        version: env.APP_VERSION,
        uptime: Math.round(process.uptime()),
      },
      error: db ? null : { code: 'DB_UNAVAILABLE', message: 'Database is not connected' },
      meta: { requestId: req.id, timestamp: new Date().toISOString() },
    });
  };
  app.get('/health', health);
  app.get('/ready', health);
  app.get(`${env.API_PREFIX}/health`, health);

  app.get('/.well-known/jwks.json', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json(cryptoService.jwks());
  });

  app.get('/', (req, res) => {
    res.json({
      success: true,
      data: {
        name: 'CertTrack API',
        version: env.APP_VERSION,
        docs: '/api-docs',
        health: '/health',
      },
      error: null,
      meta: { requestId: req.id },
    });
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.get('/api-docs.json', (req, res) => res.json(openapi));

  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/certificates`, certificateRoutes);
  app.use(`${env.API_PREFIX}/certificates`, commentRoutes);
  app.use(`${env.API_PREFIX}/ocr`, ocrRoutes);
  app.use(`${env.API_PREFIX}/credits`, creditRoutes);
  app.use(`${env.API_PREFIX}/analytics`, analyticsRoutes);
  app.use(`${env.API_PREFIX}/notifications`, notificationRoutes);
  app.use(`${env.API_PREFIX}/admin`, adminRoutes);
  app.use(`${env.API_PREFIX}/verify`, verifyRoutes);
  app.use(`${env.API_PREFIX}/audit-logs`, auditRoutes);
  app.use(`${env.API_PREFIX}/feature-flags`, featureFlagRoutes);
  app.use(`${env.API_PREFIX}/ai`, aiRoutes);
  app.use(`${env.API_PREFIX}/reports`, reportRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

process.on('unhandledRejection', (reason) =>
  logger.error({ reason }, '[process] unhandled rejection')
);

module.exports = { createApp };
