const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    orderID: {
      type: String,
      required: true,
      trim: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reviewText: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Review cannot exceed 500 characters.'],
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    approved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// One review per order
reviewSchema.index({ orderId: 1 }, { unique: true });
reviewSchema.index({ approved: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
