require('dotenv').config();

const path = require('path');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

function bool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const env = {
  NODE_ENV,
  isProd,
  isTest,
  PORT: num(process.env.PORT, 5000),
  API_PREFIX: '/api/v1',
  SERVER_URL: process.env.SERVER_URL || `http://localhost:${num(process.env.PORT, 5000)}`,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/certtrack',
  MONGO_MAX_POOL: num(process.env.MONGO_MAX_POOL, 10),

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL_DAYS: num(process.env.REFRESH_TOKEN_TTL_DAYS, 7),
  BCRYPT_SALT_ROUNDS: num(process.env.BCRYPT_SALT_ROUNDS, 12),
  MAX_LOGIN_ATTEMPTS: num(process.env.MAX_LOGIN_ATTEMPTS, 5),
  LOCKOUT_MINUTES: num(process.env.LOCKOUT_MINUTES, 15),

  COOKIE_SECURE: bool(process.env.COOKIE_SECURE, isProd),
  COOKIE_SAMESITE: process.env.COOKIE_SAMESITE || (isProd ? 'strict' : 'lax'),
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN || undefined,

  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
  MAX_UPLOAD_BYTES: num(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024),
  MAX_BULK_ITEMS: num(process.env.MAX_BULK_ITEMS, 500),
  MAX_CERTIFICATES_PER_SEMESTER: num(process.env.MAX_CERTIFICATES_PER_SEMESTER, 20),

  SIGNING_KEY_ID: process.env.SIGNING_KEY_ID || 'ct-key-1',
  SIGNING_PRIVATE_KEY: process.env.SIGNING_PRIVATE_KEY || '',
  SIGNING_KEYS_DIR: process.env.SIGNING_KEYS_DIR || path.join(__dirname, '..', '..', '.keys'),
  ISSUER_URL: process.env.ISSUER_URL || process.env.SERVER_URL || 'http://localhost:5000',

  AI_ENABLED: bool(process.env.AI_ENABLED, true),
  AI_DAILY_LIMIT: num(process.env.AI_DAILY_LIMIT, 50),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: num(process.env.SMTP_PORT, 587),
  SMTP_SECURE: bool(process.env.SMTP_SECURE, false),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'CertTrack <no-reply@certtrack.local>',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback',
  GOOGLE_ALLOWED_DOMAIN: process.env.GOOGLE_ALLOWED_DOMAIN || '',

  REDIS_URL: process.env.REDIS_URL || '',
  SLA_REMIND_DAYS: num(process.env.SLA_REMIND_DAYS, 3),
  SLA_ESCALATE_DAYS: num(process.env.SLA_ESCALATE_DAYS, 7),
  ENABLE_CRON: bool(process.env.ENABLE_CRON, !isTest),
  INSTITUTION_NAME: process.env.INSTITUTION_NAME || 'CertTrack College',
  REQUIRED_CREDITS: num(process.env.REQUIRED_CREDITS, 20),
  LOG_LEVEL: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  TRUST_PROXY: num(process.env.TRUST_PROXY, 1),
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
};

if (env.isProd) {
  const insecure = [];
  if (!process.env.JWT_ACCESS_SECRET) insecure.push('JWT_ACCESS_SECRET');
  else if (process.env.JWT_ACCESS_SECRET.length < 32)
    insecure.push('JWT_ACCESS_SECRET (min 32 chars)');
  if (!process.env.JWT_REFRESH_SECRET) insecure.push('JWT_REFRESH_SECRET');
  else if (process.env.JWT_REFRESH_SECRET.length < 32)
    insecure.push('JWT_REFRESH_SECRET (min 32 chars)');
  if (!process.env.MONGODB_URI) insecure.push('MONGODB_URI');
  if (String(process.env.COOKIE_SECURE).toLowerCase() !== 'true')
    insecure.push('COOKIE_SECURE=true');
  if (insecure.length) {
    throw new Error(
      `[env] production configuration is incomplete or unsafe: ${insecure.join(', ')}`
    );
  }
}

module.exports = env;
