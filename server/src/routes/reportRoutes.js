const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/reportController');
const vc = require('../controllers/vcController');

router.use(protect);
router.get('/transcript/:studentId', c.transcript);
router.get('/department', authorize('faculty', 'hod', 'admin'), c.department);
router.get('/department/json', authorize('faculty', 'hod', 'admin'), c.departmentJson);
router.get('/certificates', authorize('faculty', 'hod', 'admin'), c.certificates);
router.get('/certificates/json', authorize('faculty', 'hod', 'admin'), c.certificatesJson);
router.get('/audit', authorize('hod', 'admin'), c.audit);
router.get('/credential/:id', vc.exportVC);

module.exports = router;
