const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  submitReview,
  getReviews,
  toggleApproval,
  deleteReview,
} = require('../controllers/reviewController');

// ─── Public ────────────────────────────────────────────────────────────────

// POST /api/reviews/submit
router.post(
  '/submit',
  [
    body('orderID').trim().notEmpty().withMessage('Order ID is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('reviewText')
      .trim()
      .notEmpty().withMessage('Review text is required.')
      .isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters.'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5.'),
  ],
  validate,
  submitReview
);

// ─── Admin ─────────────────────────────────────────────────────────────────

// GET /api/reviews/admin
router.get(
  '/admin',
  protect,
  [query('approved').optional().isBoolean()],
  validate,
  getReviews
);

// PATCH /api/reviews/admin/:id/toggle
router.patch(
  '/admin/:id/toggle',
  protect,
  [param('id').isMongoId().withMessage('Invalid review ID.')],
  validate,
  toggleApproval
);

// DELETE /api/reviews/admin/:id
router.delete(
  '/admin/:id',
  protect,
  [param('id').isMongoId().withMessage('Invalid review ID.')],
  validate,
  deleteReview
);

module.exports = router;
