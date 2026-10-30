const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/auditController');

router.use(protect);
router.get('/', authorize('admin', 'hod'), c.list);

module.exports = router;
