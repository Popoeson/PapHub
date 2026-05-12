const express = require('express');
const router  = express.Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const protect  = require('../middleware/auth');
const ctrl     = require('../controllers/reviewController');

// ─── PUBLIC ──────────────────────────────────────────────────────────────────

/**
 * POST /api/reviews/submit
 */
router.post(
  '/submit',
  [
    body('orderID').trim().notEmpty().withMessage('Order ID is required.'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required.'),
    body('name').trim().notEmpty().isLength({ max: 80 }).withMessage('Name is required (max 80 chars).'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
    body('comment').trim().notEmpty().isLength({ max: 1000 }).withMessage('Comment is required (max 1000 chars).'),
  ],
  validate,
  ctrl.submitReview
);

// ─── ADMIN ────────────────────────────────────────────────────────────────────

router.get('/',                       protect, ctrl.listReviews);
router.patch('/:id/toggle-approval',  protect, param('id').isMongoId(), validate, ctrl.toggleApproval);
router.delete('/:id',                 protect, param('id').isMongoId(), validate, ctrl.deleteReview);

module.exports = router;
