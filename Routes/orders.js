const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Product = require('../models/Product');
const Order = require('../models/Order');

const router = express.Router();

router.post('/', async (req, res) => {
  const { customerName, phone, address, items } = req.body;

  // Validate input
  if (!customerName || !phone || !address || !items.length) {
    return res.status(400).json({ msg: 'Invalid input' });
  }

  let total = 0;
  let validatedItems = [];

  // 🔥 BACKEND CALCULATES TOTAL
  for (let item of items) {
    const product = await Product.findById(item.productId);
    if (!product) continue;

    const itemTotal = product.price * item.quantity;
    total += itemTotal;

    validatedItems.push({
      productId: product._id,
      name: product.name,
      price: product.price,
      quantity: item.quantity
    });
  }

  const order = new Order({
    orderId: uuidv4(), // 🔐 secure ID
    customerName,
    phone,
    address,
    items: validatedItems,
    totalAmount: total
  });

  await order.save();

  res.json(order);
});

module.exports = router;