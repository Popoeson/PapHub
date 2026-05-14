const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

router.use(protect);

// GET — both roles can read
router.get('/', getCategories);

// Write operations — superadmin only
router.post(
  '/',
  requireRole('superadmin'),
  [body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ max: 50 })],
  validate,
  createCategory
);

router.patch(
  '/:id',
  requireRole('superadmin'),
  [
    param('id').isMongoId().withMessage('Invalid category ID.'),
    body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ max: 50 }),
  ],
  validate,
  updateCategory
);

router.delete(
  '/:id',
  requireRole('superadmin'),
  [param('id').isMongoId().withMessage('Invalid category ID.')],
  validate,
  deleteCategory
);

module.exports = router;
