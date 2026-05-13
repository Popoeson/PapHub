const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: null },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    orderID: {
      type: String,
      default: () => `PH-${nanoid(8).toUpperCase()}`,
    },
    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true, default: '' },
    items: { type: [orderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    paystackReference: { type: String, sparse: true },
    status: {
      type: String,
      enum: ['pending', 'delivered'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Single source of truth for indexes
orderSchema.index({ orderID: 1 }, { unique: true });
orderSchema.index({ paystackReference: 1 }, { unique: true, sparse: true });
orderSchema.index({ email: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
