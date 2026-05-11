const crypto = require('crypto');
const Order = require('../models/Order');
const {
  sendCustomerOrderEmail,
  sendAdminOrderEmail,
  generateWhatsAppUrl,
} = require('../utils/mailer');

/**
 * POST /api/webhook/paystack
 *
 * - Verifies Paystack HMAC-SHA512 signature
 * - Handles charge.success event only
 * - Guards against duplicate webhook calls
 * - Creates order in DB
 * - Sends customer and admin emails
 */
const paystackWebhook = async (req, res) => {
  // ── 1. Verify signature ────────────────────────────────────────────────
  const signature = req.headers['x-paystack-signature'];

  if (!signature) {
    return res.status(401).json({ message: 'No signature.' });
  }

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(req.rawBody) // rawBody set by express raw middleware — see server.js
    .digest('hex');

  if (hash !== signature) {
    console.warn('Webhook signature mismatch. Possible spoofing attempt.');
    return res.status(401).json({ message: 'Invalid signature.' });
  }

  // ── 2. Parse event ─────────────────────────────────────────────────────
  const event = req.body;

  // Acknowledge immediately — Paystack expects fast response
  res.status(200).json({ received: true });

  // Only process successful charges
  if (event.event !== 'charge.success') return;

  const data = event.data;
  const reference = data.reference;
  const amountPaid = data.amount / 100; // convert kobo to naira
  const email = data.customer?.email;
  const metadata = data.metadata || {};

  try {
    // ── 3. Duplicate reference guard ───────────────────────────────────
    const existing = await Order.findOne({ paystackReference: reference });
    if (existing) {
      console.log(`Duplicate webhook for reference: ${reference}. Skipping.`);
      return;
    }

    // ── 4. Reconstruct and validate items from metadata ────────────────
    const items = metadata.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.error(`Webhook: missing items in metadata for reference ${reference}`);
      return;
    }

    // Recalculate total from metadata items to verify amount paid
    const expectedTotal = items.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    // Allow ₦1 tolerance for floating point differences
    if (Math.abs(amountPaid - expectedTotal) > 1) {
      console.error(
        `Webhook: amount mismatch for ${reference}. Paid: ${amountPaid}, Expected: ${expectedTotal}`
      );
      return;
    }

    // ── 5. Create order ────────────────────────────────────────────────
    const order = await Order.create({
      customerName: metadata.customerName,
      email,
      phone: metadata.phone,
      address: metadata.address,
      landmark: metadata.landmark || '',
      items,
      totalAmount: amountPaid,
      paystackReference: reference,
      status: 'pending',
    });

    console.log(`Order created: ${order.orderID} — ₦${amountPaid}`);

    // ── 6. Send emails (non-blocking — don't await both) ───────────────
    Promise.allSettled([
      sendCustomerOrderEmail(order),
      sendAdminOrderEmail(order),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`Email ${i === 0 ? 'customer' : 'admin'} send failed:`, r.reason?.message);
        }
      });
    });

    // WhatsApp URL is generated on demand by the success page — not needed here
  } catch (err) {
    console.error('Webhook processing error:', err.message);
  }
};

/**
 * GET /api/webhook/order/:reference
 *
 * Called by the success page to fetch order details after redirect.
 * Returns order + WhatsApp URL.
 */
const getOrderByReference = async (req, res) => {
  try {
    const { reference } = req.params;

    if (!reference) {
      return res.status(400).json({ message: 'Reference required.' });
    }

    const order = await Order.findOne({ paystackReference: reference });

    if (!order) {
      // Webhook may not have fired yet — return 202 so client can retry
      return res.status(202).json({ message: 'Order processing. Please wait.' });
    }

    const whatsappUrl = generateWhatsAppUrl(order);

    return res.status(200).json({
      order: {
        orderID: order.orderID,
        customerName: order.customerName,
        email: order.email,
        phone: order.phone,
        address: order.address,
        landmark: order.landmark,
        items: order.items,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
      },
      whatsappUrl,
    });
  } catch (err) {
    console.error('getOrderByReference error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { paystackWebhook, getOrderByReference };
