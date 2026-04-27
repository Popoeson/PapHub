const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

// ✅ GET ALL PRODUCTS (PUBLIC)
router.get('/', async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
});

// ✅ ADD PRODUCT (ADMIN ONLY)
router.post('/', auth, async (req, res) => {
  const { name, price, image, description } = req.body;

  if (!name || !price) {
    return res.status(400).json({ msg: 'Name and price required' });
  }

  const product = new Product({
    name,
    price,
    image,
    description
  });

  await product.save();
  res.json(product);
});

// ✅ DELETE PRODUCT
router.delete('/:id', auth, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ msg: 'Product deleted' });
});

module.exports = router;