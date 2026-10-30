const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const skip = () => env.isTest;

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
    meta: null,
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts' },
    meta: null,
  },
});

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many email requests' },
    meta: null,
  },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'AI hourly limit reached' },
    meta: null,
  },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Too many verification requests' },
    meta: null,
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skip,
  message: {
    success: false,
    data: null,
    error: { code: 'RATE_LIMITED', message: 'Upload limit reached' },
    meta: null,
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  emailLimiter,
  aiLimiter,
  uploadLimiter,
  verifyLimiter,
};
