const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/notificationController');
const v = require('../validators/miscValidators');

router.use(protect);
router.get('/', c.list);
router.patch('/read-all', c.markAllRead);
router.get('/preferences', c.getPrefs);
router.patch('/preferences', validate(v.prefsSchema), c.updatePrefs);
router.patch('/:id/read', c.markRead);
router.delete('/:id', c.remove);

module.exports = router;
