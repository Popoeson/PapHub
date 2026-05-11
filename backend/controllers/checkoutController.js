const Product = require('../models/Product');
const axios = require('axios');

/**
 * POST /api/checkout/initialize
 *
 * Receives: customer details + cart items (productId + quantity only)
 * Server fetches real prices from DB — never trusts frontend prices.
 * Initializes a Paystack transaction and returns the authorization URL.
 */
const initializeCheckout = async (req, res) => {
  try {
    const { customerName, email, phone, address, landmark, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    // ── Fetch real product data from DB ──────────────────────────────────
    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      inStock: true,
    }).select('_id name price images');

    if (products.length !== items.length) {
      return res.status(400).json({
        message: 'One or more items are unavailable or out of stock. Please refresh your cart.',
      });
    }

    // ── Build verified order items with server prices ─────────────────────
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    const verifiedItems = items.map((item) => {
      const product = productMap.get(item.productId.toString());
      return {
        productId: product._id,
        name: product.name,
        price: product.price,         // server price — never item.price
        quantity: parseInt(item.quantity),
        image: product.images?.[0]?.url || null,
      };
    });

    // ── Calculate total server-side ───────────────────────────────────────
    const totalAmount = verifiedItems.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // ── Store pending order data in a short-lived way via Paystack metadata
    // The actual Order document is created only after webhook confirms payment
    const metadata = {
      customerName,
      phone,
      address,
      landmark: landmark || '',
      items: verifiedItems,
      custom_fields: [
        { display_name: 'Customer Name', variable_name: 'customerName', value: customerName },
        { display_name: 'Phone', variable_name: 'phone', value: phone },
        { display_name: 'Address', variable_name: 'address', value: address },
      ],
    };

    // ── Initialize Paystack transaction ───────────────────────────────────
    const paystackRes = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(totalAmount * 100), // Paystack uses kobo
        currency: 'NGN',
        callback_url: `${process.env.FRONTEND_URL}/pages/success.html`,
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url, reference } = paystackRes.data.data;

    return res.status(200).json({
      authorizationUrl: authorization_url,
      reference,
    });
  } catch (err) {
    console.error('initializeCheckout error:', err?.response?.data || err.message);
    return res.status(500).json({ message: 'Failed to initialize payment. Please try again.' });
  }
};

module.exports = { initializeCheckout };
