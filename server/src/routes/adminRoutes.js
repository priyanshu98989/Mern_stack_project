const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { csvUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');
const c = require('../controllers/adminController');
const v = require('../validators/adminValidators');

router.use(protect);

router.get('/users', authorize('admin'), c.listUsers);
router.get('/users/export', authorize('admin'), c.exportUsers);
router.get('/students', authorize('faculty', 'hod', 'admin'), c.listStudents);
router.get('/users/:id', authorize('admin', 'hod'), c.getUser);
router.post('/users', authorize('admin'), validate(v.createUserSchema), c.createUser);
router.patch('/users/:id', authorize('admin'), validate(v.updateUserSchema), c.updateUser);
router.delete('/users/:id', authorize('admin'), c.deleteUser);
router.post('/users/:id/reset-password', authorize('admin'), c.resetUserPassword);
router.post('/import/users', authorize('admin'), csvUpload.single('file'), c.importUsers);
router.post(
  '/import/certificates',
  authorize('admin'),
  csvUpload.single('file'),
  c.importCertificates
);

router.get('/departments', c.listDepartments);
router.post('/departments', authorize('admin'), validate(v.departmentSchema), c.createDepartment);
router.patch(
  '/departments/:id',
  authorize('admin'),
  validate(v.updateDepartmentSchema),
  c.updateDepartment
);

router.get('/batches', c.listBatches);
router.post('/batches', authorize('admin'), validate(v.batchSchema), c.createBatch);

router.get('/faculty-assignments', authorize('admin', 'hod'), c.listAssignments);
router.post(
  '/faculty-assignments',
  authorize('admin', 'hod'),
  validate(v.assignmentSchema),
  c.createAssignment
);
router.post(
  '/faculty-assignments/bulk',
  authorize('admin'),
  validate(v.bulkAssignmentSchema),
  c.bulkAssignments
);
router.delete('/faculty-assignments/:id', authorize('admin', 'hod'), c.deleteAssignment);

router.get('/settings', authorize('admin'), c.getSettings);
router.patch('/settings', authorize('admin'), validate(v.settingsSchema), c.updateSettings);

module.exports = router;
