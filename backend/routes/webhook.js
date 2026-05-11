const express = require('express');
const router = express.Router();
const { paystackWebhook, getOrderByReference } = require('../controllers/webhookController');

// POST /api/webhook/paystack
// Raw body required for signature verification — handled in server.js
router.post('/paystack', paystackWebhook);

// GET /api/webhook/order/:reference
// Called by success page to retrieve confirmed order
router.get('/order/:reference', getOrderByReference);

module.exports = router;
