const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/creditController');
const v = require('../validators/creditRuleValidators');

router.use(protect);
router.get('/me', c.me);
router.get('/user/:userId', c.forUser);
router.get('/ledger/:userId', c.ledger);
router.get('/breakdown/:id', c.breakdown);

router.get('/rules', authorize('admin'), c.listRules);
router.post('/rules', authorize('admin'), validate(v.createRuleSchema), c.createRule);
router.post('/rules/simulate', authorize('admin'), validate(v.simulateSchema), c.simulate);
router.patch('/rules/:id', authorize('admin'), validate(v.updateRuleSchema), c.updateRule);
router.patch('/rules/:id/deactivate', authorize('admin'), c.deactivateRule);
router.post('/adjust', authorize('admin'), validate(v.adjustSchema), c.adjust);

module.exports = router;
