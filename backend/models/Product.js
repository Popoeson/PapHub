const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required.'],
      trim: true,
      maxlength: [100, 'Product name cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required.'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required.'],
      min: [0, 'Price cannot be negative.'],
    },
    slashPrice: {
      type: Number,
      default: null,
      min: [0, 'Slash price cannot be negative.'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required.'],
    },
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true }, // Cloudinary public_id for deletion
      },
    ],
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for fast category filtering on the store page
productSchema.index({ category: 1, inStock: 1 });

module.exports = mongoose.model('Product', productSchema);
