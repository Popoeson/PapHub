const Review = require('../models/Review');
const Order  = require('../models/Order');
const cache  = require('../utils/cache');

// ─── PUBLIC ──────────────────────────────────────────────────────────────────

/**
 * POST /api/reviews/submit
 * Body: { orderID, email, name, rating, comment }
 *
 * Guards:
 *  1. Order must exist with matching email (case-insensitive)
 *  2. Order status must be "delivered"
 *  3. Only one review allowed per order
 */
exports.submitReview = async (req, res) => {
  try {
    const { orderID, email, name, rating, comment } = req.body;

    // 1. Find order
    const order = await Order.findOne({ orderID: orderID.trim().toUpperCase() });
    if (!order) {
      return res.status(404).json({ message: 'Order not found. Please check your order ID.' });
    }

    // 2. Email must match
    if (order.email.toLowerCase() !== email.toLowerCase().trim()) {
      return res.status(400).json({ message: 'Email does not match the order.' });
    }

    // 3. Must be delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({
        message: 'You can only leave a review after your order has been delivered.',
      });
    }

    // 4. One review per order (unique index will also catch this, but give a clean message)
    const existing = await Review.findOne({ orderID: order.orderID });
    if (existing) {
      return res.status(409).json({ message: 'A review has already been submitted for this order.' });
    }

    const review = await Review.create({
      orderID: order.orderID,
      email:   order.email,
      name:    name.trim(),
      rating:  Number(rating),
      comment: comment.trim(),
    });

    // Invalidate approved reviews cache
    cache.invalidatePattern('public:reviews');

    res.status(201).json({ message: 'Review submitted! It will appear once approved.', review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A review has already been submitted for this order.' });
    }
    console.error('submitReview error:', err);
    res.status(500).json({ message: 'Server error. Please try again.' });
  }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/reviews
 * Query: ?approved=true|false|all  (default: all)
 *        &page=1  &limit=20
 */
exports.listReviews = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.approved === 'true')  filter.approved = true;
    if (req.query.approved === 'false') filter.approved = false;

    const [reviews, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Review.countDocuments(filter),
    ]);

    res.json({
      reviews,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('listReviews error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * PATCH /api/admin/reviews/:id/toggle-approval
 * Toggles the `approved` field.
 */
exports.toggleApproval = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    review.approved = !review.approved;
    await review.save();

    cache.invalidatePattern('public:reviews');

    res.json({ message: `Review ${review.approved ? 'approved' : 'unapproved'}.`, review });
  } catch (err) {
    console.error('toggleApproval error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

/**
 * DELETE /api/admin/reviews/:id
 */
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found.' });

    cache.invalidatePattern('public:reviews');

    res.json({ message: 'Review deleted.' });
  } catch (err) {
    console.error('deleteReview error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ─── PUBLIC APPROVED ─────────────────────────────────────────────────────────

/**
 * GET /api/public/reviews
 * Returns approved reviews for the store page. Cached.
 */
exports.getApprovedReviews = async (req, res) => {
  try {
    const cacheKey = 'public:reviews:approved';
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const reviews = await Review.find({ approved: true })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('name rating comment createdAt')
      .lean();

    cache.set(cacheKey, reviews);
    res.json(reviews);
  } catch (err) {
    console.error('getApprovedReviews error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};
