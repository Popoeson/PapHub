const Review = require('../models/Review');
const Order = require('../models/Order');
const cache = require('../utils/cache');

// ─── Public ────────────────────────────────────────────────────────────────

/**
 * POST /api/reviews/submit
 * Validates order ID + email, checks delivered status,
 * enforces one review per order.
 */
const submitReview = async (req, res) => {
  try {
    const { orderID, email, reviewText, rating } = req.body;

    // Find order by orderID string and email
    const order = await Order.findOne({
      orderID: orderID.trim().toUpperCase(),
      email: email.toLowerCase().trim(),
    });

    if (!order) {
      return res.status(404).json({
        message: 'No order found matching that Order ID and email address.',
      });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({
        message: 'Reviews can only be submitted after your order has been delivered.',
      });
    }

    // One review per order
    const existing = await Review.findOne({ orderId: order._id });
    if (existing) {
      return res.status(409).json({
        message: 'A review has already been submitted for this order.',
      });
    }

    const review = await Review.create({
      orderID: order.orderID,
      orderId: order._id,
      email: order.email,
      reviewText: reviewText.trim(),
      rating: parseInt(rating),
      approved: false,
    });

    // Invalidate public reviews cache
    cache.invalidate('public:reviews');

    res.status(201).json({
      message: 'Review submitted successfully. It will appear after approval.',
      review: {
        orderID: review.orderID,
        rating: review.rating,
        reviewText: review.reviewText,
      },
    });
  } catch (err) {
    console.error('submitReview error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── Admin ─────────────────────────────────────────────────────────────────

// GET /api/admin/reviews
const getReviews = async (req, res) => {
  try {
    const { approved, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (approved !== undefined) {
      filter.approved = approved === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      reviews,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getReviews error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/admin/reviews/:id/toggle
const toggleApproval = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    review.approved = !review.approved;
    await review.save();

    // Invalidate public reviews cache
    cache.invalidate('public:reviews');

    res.status(200).json({
      message: `Review ${review.approved ? 'approved' : 'hidden'}.`,
      approved: review.approved,
    });
  } catch (err) {
    console.error('toggleApproval error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/admin/reviews/:id
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    cache.invalidate('public:reviews');
    res.status(200).json({ message: 'Review deleted.' });
  } catch (err) {
    console.error('deleteReview error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { submitReview, getReviews, toggleApproval, deleteReview };
