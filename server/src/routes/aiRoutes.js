const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const c = require('../controllers/aiController');
const v = require('../validators/aiValidators');

router.use(protect);
router.post('/analyze/:id', aiLimiter, c.analyze);
router.post('/semantic-duplicates', aiLimiter, validate(v.semanticSchema), c.semanticDuplicates);
router.post('/skill-gap', aiLimiter, validate(v.skillGapSchema), c.skillGap);
router.get(
  '/verifier-copilot/:id',
  aiLimiter,
  authorize('faculty', 'hod', 'admin'),
  c.verifierCopilot
);
router.post('/apply/:id', validate(v.applySchema), c.apply);

module.exports = router;
