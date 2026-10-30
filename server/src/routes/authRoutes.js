const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authLimiter, emailLimiter } = require('../middleware/rateLimiter');
const { protect, optionalAuth } = require('../middleware/auth');
const { csrfProtect } = require('../middleware/csrf');
const v = require('../validators/authValidators');

router.get('/csrf', authController.csrf);
router.post('/register', authLimiter, validate(v.registerSchema), authController.register);
router.post('/login', authLimiter, validate(v.loginSchema), authController.login);
router.post('/refresh', csrfProtect, authController.refresh);
router.post('/logout', optionalAuth, authController.logout);
router.post(
  '/forgot-password',
  emailLimiter,
  validate(v.forgotSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password/:token',
  authLimiter,
  validate(v.resetSchema),
  authController.resetPassword
);
router.get('/verify-email/:token', authController.verifyEmail);
router.post(
  '/resend-verification',
  emailLimiter,
  validate(v.resendVerificationSchema),
  authController.resendVerification
);
router.post(
  '/change-password',
  protect,
  validate(v.changePasswordSchema),
  authController.changePassword
);
router.get('/me', protect, authController.me);
router.patch('/me', protect, validate(v.updateProfileSchema), authController.updateProfile);
router.post(
  '/2fa/setup',
  protect,
  authLimiter,
  validate(v.setupTwoFactorSchema),
  authController.setupTwoFactor
);
router.post(
  '/2fa/enable',
  protect,
  authLimiter,
  validate(v.enableTwoFactorSchema),
  authController.enableTwoFactor
);
router.post(
  '/2fa/disable',
  protect,
  authLimiter,
  validate(v.disableTwoFactorSchema),
  authController.disableTwoFactor
);
router.get('/sessions', protect, authController.sessions);
router.delete('/sessions/:id', protect, authController.revokeSession);
router.get('/google', authController.googleStart);
router.get('/google/callback', authController.googleCallback);

module.exports = router;
