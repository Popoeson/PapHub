const Category = require('../models/Category');
const Product = require('../models/Product');

const cache = require('../utils/cache');
const CACHE_KEY = 'categories:all';
const CACHE_TTL = 120;

// GET /api/admin/categories
const getCategories = async (req, res) => {
  try {
    const cached = cache.get(CACHE_KEY);
    if (cached) return res.status(200).json(cached);

    const categories = await Category.find().sort({ name: 1 });

    const payload = { categories };

    cache.set(CACHE_KEY, payload, CACHE_TTL);

    res.status(200).json(payload);
  } catch (err) {
    console.error('getCategories error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/admin/categories
const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });

    if (existing) {
      return res.status(409).json({ message: 'Category already exists.' });
    }

    const category = await Category.create({ name });

    cache.invalidate(CACHE_KEY);

    res.status(201).json({ message: 'Category created.', category });
  } catch (err) {
    console.error('createCategory error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/admin/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;

    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: req.params.id },
    });

    if (existing) {
      return res.status(409).json({ message: 'Another category with that name already exists.' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    cache.invalidate(CACHE_KEY);

    res.status(200).json({ message: 'Category updated.', category });
  } catch (err) {
    console.error('updateCategory error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/admin/categories/:id
const deleteCategory = async (req, res) => {
  try {
    // Prevent deletion if products are using this category
    const productCount = await Product.countDocuments({ category: req.params.id });

    if (productCount > 0) {
      return res.status(400).json({
        message: `Cannot delete. ${productCount} product(s) are using this category. Reassign or delete them first.`,
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }

    cache.invalidate(CACHE_KEY);

    res.status(200).json({ message: 'Category deleted.' });
  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};