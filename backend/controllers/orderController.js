const Order = require('../models/Order');
const cache = require('../utils/cache');

// GET /api/admin/orders
const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const filter = {};
    if (status && ['pending', 'delivered'].includes(status)) {
      filter.status = status;
    }

    // Search by orderID, customer name, or email
    if (search) {
      filter.$or = [
        { orderID: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('orderID customerName email phone address landmark totalAmount status createdAt items'),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getOrders error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/orders/:id
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.status(200).json({ order });
  } catch (err) {
    console.error('getOrder error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/admin/orders/:id/deliver
const markDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Order is already marked as delivered.' });
    }

    order.status = 'delivered';
    await order.save();

    // Invalidate review cache since delivered orders unlock review submission
    cache.invalidate('public:reviews');

    res.status(200).json({ message: 'Order marked as delivered.', order });
  } catch (err) {
    console.error('markDelivered error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/admin/orders/:id
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.status(200).json({ message: 'Order deleted.' });
  } catch (err) {
    console.error('deleteOrder error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/admin/orders/bulk
const bulkDeleteOrders = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No order IDs provided.' });
    }

    const result = await Order.deleteMany({ _id: { $in: ids } });

    res.status(200).json({
      message: `${result.deletedCount} order(s) deleted.`,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error('bulkDeleteOrders error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/orders/stats
// Used by dashboard — returns aggregate counts and revenue
const getOrderStats = async (req, res) => {
  try {
    const [total, pending, delivered, revenueResult, recent] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.aggregate([
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderID customerName totalAmount status createdAt'),
    ]);

    res.status(200).json({
      stats: {
        totalOrders: total,
        pendingOrders: pending,
        deliveredOrders: delivered,
        totalRevenue: revenueResult[0]?.total || 0,
      },
      recentOrders: recent,
    });
  } catch (err) {
    console.error('getOrderStats error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  getOrders,
  getOrder,
  markDelivered,
  deleteOrder,
  bulkDeleteOrders,
  getOrderStats,
};
