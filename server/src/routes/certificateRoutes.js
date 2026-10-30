const express = require('express');
const router = express.Router();
const { protect, authorize, requireVerified } = require('../middleware/auth');
const { upload, validateMagicBytes } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const c = require('../controllers/certificateController');
const creditController = require('../controllers/creditController');
const v = require('../validators/certificateValidators');

router.use(protect);

router.get('/platforms', c.listPlatforms);
router.post('/platforms', authorize('admin'), validate(v.platformSchema), c.createPlatform);
router.patch(
  '/platforms/:id',
  authorize('admin'),
  validate(v.updatePlatformSchema),
  c.updatePlatform
);

router.get('/', c.list);
router.post('/', requireVerified, validate(v.createSchema), c.create);

router.get('/:id/proof', c.proof);
router.get('/:id', c.getById);
router.patch(
  '/:id',
  authorize('student', 'admin'),
  requireVerified,
  validate(v.updateSchema),
  c.update
);
router.delete('/:id', c.remove);
router.post('/:id/submit', requireVerified, c.submit);
router.post(
  '/:id/proof',
  requireVerified,
  uploadLimiter,
  upload.single('proof'),
  validateMagicBytes,
  c.uploadProof
);
router.post('/:id/ocr', requireVerified, uploadLimiter, c.runOcr);
router.post(
  '/:id/transition',
  authorize('faculty', 'hod', 'admin'),
  validate(v.transitionSchema),
  c.transition
);
router.post('/:id/verify-external', authorize('faculty', 'hod', 'admin'), c.checkExternal);
router.get('/:id/history', c.history);
router.get('/:id/breakdown', creditController.breakdown);

module.exports = router;
