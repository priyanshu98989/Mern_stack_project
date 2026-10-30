const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const a = require('../controllers/analyticsController');

router.use(protect);
router.get('/student/:id', a.student);
router.get('/faculty/:id', authorize('faculty', 'hod', 'admin'), a.faculty);
router.get('/department/:id', authorize('faculty', 'hod', 'admin'), a.department);
router.get('/leaderboard', a.leaderboard);
router.get('/trends', a.trends);
router.get('/overview', authorize('admin'), a.overview);

module.exports = router;
