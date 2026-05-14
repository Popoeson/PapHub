const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const validate = require('../middleware/validate');
const { upload } = require('../config/cloudinary');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleStock,
} = require('../controllers/productController');

router.use(protect);
router.use(requireRole('superadmin'));

router.get('/', getProducts);
router.get('/:id', [param('id').isMongoId()], validate, getProduct);

router.post(
  '/',
  upload.array('images', 4),
  [
    body('name').trim().notEmpty().withMessage('Product name is required.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required.'),
    body('category').isMongoId().withMessage('Valid category is required.'),
  ],
  validate,
  createProduct
);

router.patch(
  '/:id',
  upload.array('images', 4),
  [param('id').isMongoId().withMessage('Invalid product ID.')],
  validate,
  updateProduct
);

router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid product ID.')],
  validate,
  deleteProduct
);

router.patch(
  '/:id/toggle-stock',
  [param('id').isMongoId().withMessage('Invalid product ID.')],
  validate,
  toggleStock
);

module.exports = router;
