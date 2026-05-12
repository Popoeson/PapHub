const express = require('express');
const router = express.Router();
const { query, param } = require('express-validator');
const validate = require('../middleware/validate');
const cache = require('../utils/cache');
const Product = require('../models/Product');
const Category = require('../models/Category');
const { getApprovedReviews } = require('../controllers/reviewController');


const CACHE_TTL = 120;

// GET /api/public/categories
router.get('/categories', async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    const categories = await Category.find().sort({ name: 1 });
    const payload = { categories };
    cache.set(cacheKey, payload, CACHE_TTL);
    res.status(200).json(payload);
  } catch (err) {
    console.error('public getCategories error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/public/products
// Supports: ?category=id&page=1&limit=20
// Only returns inStock products for the store
router.get(
  '/products',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('category').optional().isMongoId(),
  ],
  validate,
  async (req, res) => {
    try {
      const { category, page = 1, limit = 20 } = req.query;
      const cacheKey = `public:products:cat=${category || 'all'}&page=${page}&limit=${limit}`;

      const cached = cache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const filter = { inStock: true };
      if (category) filter.category = category;

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
        Product.find(filter)
          .populate('category', 'name slug')
          .select('name description price slashPrice images category inStock')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Product.countDocuments(filter),
      ]);

      const payload = {
        products,
        pagination: { total, page, pages: Math.ceil(total / limit) },
      };

      cache.set(cacheKey, payload, CACHE_TTL);
      res.status(200).json(payload);
    } catch (err) {
      console.error('public getProducts error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/public/products/:id — single product detail
router.get(
  '/products/:id',
  [param('id').isMongoId().withMessage('Invalid product ID.')],
  validate,
  async (req, res) => {
    try {
      const cacheKey = `public:product:${req.params.id}`;
      const cached = cache.get(cacheKey);
      if (cached) return res.status(200).json(cached);

      const product = await Product.findOne({ _id: req.params.id, inStock: true })
        .populate('category', 'name slug')
        .select('name description price slashPrice images category inStock');

      if (!product) return res.status(404).json({ message: 'Product not found.' });

      const payload = { product };
      cache.set(cacheKey, payload, CACHE_TTL);
      res.status(200).json(payload);
    } catch (err) {
      console.error('public getProduct error:', err);
      res.status(500).json({ message: 'Server error.' });
    }
  }
);

// GET /api/public/reviews — approved reviews for store page
router.get('/reviews', async (req, res) => {
  try {
    const cacheKey = 'public:reviews';
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json(cached);

    // Review model comes in Slice 7 — return empty for now
    const payload = { reviews: [] };
    cache.set(cacheKey, payload, CACHE_TTL);
    res.status(200).json(payload);
  } catch (err) {
    console.error('public getReviews error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});


router.get('/reviews', getApprovedReviews);

module.exports = router;
