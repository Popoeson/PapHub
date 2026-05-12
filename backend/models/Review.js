const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    orderID:   { type: String, required: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    name:      { type: String, required: true, trim: true, maxlength: 80 },
    rating:    { type: Number, required: true, min: 1, max: 5 },
    comment:   { type: String, required: true, trim: true, maxlength: 1000 },
    approved:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One review per order — enforced at DB level
reviewSchema.index({ orderID: 1 }, { unique: true });
reviewSchema.index({ approved: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
