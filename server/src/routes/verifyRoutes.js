const express = require('express');
const router = express.Router();
const { verifyLimiter } = require('../middleware/rateLimiter');
const c = require('../controllers/verifyController');

router.get('/.well-known/jwks.json', c.jwks);
router.get('/:id', verifyLimiter, c.verify);

module.exports = router;
