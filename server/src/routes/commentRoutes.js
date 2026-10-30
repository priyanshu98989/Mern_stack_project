const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const c = require('../controllers/commentController');
const v = require('../validators/miscValidators');

router.use(protect);
router.get('/:id/comments', c.list);
router.post('/:id/comments', validate(v.commentSchema), c.create);
router.delete('/:id/comments/:commentId', c.remove);

module.exports = router;
