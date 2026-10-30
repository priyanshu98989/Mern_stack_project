const express = require('express');
const router = express.Router();
const { protect, requireVerified } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const c = require('../controllers/ocrController');

router.use(protect);
router.post('/:id', requireVerified, uploadLimiter, c.runOcr);

module.exports = router;
