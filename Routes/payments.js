const express = require('express');
const axios = require('axios');
const Order = require('../models/Order');

const router = express.Router();

router.post('/verify', async (req, res) => {
  const { reference, orderId } = req.body;

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET}`
        }
      }
    );

    if (response.data.data.status === 'success') {
      await Order.findOneAndUpdate(
        { orderId },
        { status: 'paid', paymentReference: reference }
      );

      return res.json({ success: true });
    }

    res.status(400).json({ success: false });
  } catch (err) {
    res.status(500).json({ msg: 'Verification failed' });
  }
});

module.exports = router;