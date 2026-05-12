const express = require('express');
const router = express.Router();
const { param, body, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  getOrders,
  getOrder,
  markDelivered,
  deleteOrder,
  bulkDeleteOrders,
  getOrderStats,
} = require('../controllers/orderController');

router.use(protect);

// GET /api/admin/orders/stats — must be before /:id route
router.get('/stats', getOrderStats);

// GET /api/admin/orders
router.get(
  '/',
  [
    query('status').optional().isIn(['pending', 'delivered']),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  getOrders
);

// GET /api/admin/orders/:id
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid order ID.')],
  validate,
  getOrder
);

// PATCH /api/admin/orders/:id/deliver
router.patch(
  '/:id/deliver',
  [param('id').isMongoId().withMessage('Invalid order ID.')],
  validate,
  markDelivered
);

// DELETE /api/admin/orders/bulk — before /:id
router.delete(
  '/bulk',
  [
    body('ids').isArray({ min: 1 }).withMessage('IDs array required.'),
    body('ids.*').isMongoId().withMessage('Invalid order ID in array.'),
  ],
  validate,
  bulkDeleteOrders
);

// DELETE /api/admin/orders/:id
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid order ID.')],
  validate,
  deleteOrder
);

module.exports = router;
