const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { checkoutLimiter } = require('../middleware/rateLimiter');
const { initializeCheckout } = require('../controllers/checkoutController');

// POST /api/checkout/initialize
router.post(
  '/initialize',
  checkoutLimiter,
  [
    body('customerName').trim().notEmpty().withMessage('Full name is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('phone')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required.')
      .matches(/^[0-9+\s\-()]{7,20}$/)
      .withMessage('Enter a valid phone number.'),
    body('address').trim().notEmpty().withMessage('Delivery address is required.'),
    body('items').isArray({ min: 1 }).withMessage('Cart cannot be empty.'),
    body('items.*.productId').isMongoId().withMessage('Invalid product in cart.'),
    body('items.*.quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1.'),
  ],
  validate,
  initializeCheckout
);

module.exports = router;
