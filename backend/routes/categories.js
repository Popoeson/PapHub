const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

// All category admin routes are protected
router.use(protect);

// GET /api/admin/categories
router.get('/', getCategories);

// POST /api/admin/categories
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ max: 50 })],
  validate,
  createCategory
);

// PATCH /api/admin/categories/:id
router.patch(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid category ID.'),
    body('name').trim().notEmpty().withMessage('Category name is required.').isLength({ max: 50 }),
  ],
  validate,
  updateCategory
);

// DELETE /api/admin/categories/:id
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid category ID.')],
  validate,
  deleteCategory
);

module.exports = router;
