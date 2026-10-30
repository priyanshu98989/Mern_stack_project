const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/featureFlagController');
const v = require('../validators/miscValidators');

router.use(protect);
router.get('/', c.list);
router.get('/:key', c.get);
router.patch('/:key', authorize('admin'), validate(v.featureFlagSchema), c.upsert);

module.exports = router;
