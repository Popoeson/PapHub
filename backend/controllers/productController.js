const Product = require('../models/Product');
const Category = require('../models/Category');
const { deleteImage } = require('../config/cloudinary');

// GET /api/admin/products
const getProducts = async (req, res) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    console.error('getProducts error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// GET /api/admin/products/:id
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category', 'name slug');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.status(200).json({ product });
  } catch (err) {
    console.error('getProduct error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// POST /api/admin/products
const createProduct = async (req, res) => {
  try {
    const { name, description, price, slashPrice, category, inStock } = req.body;

    // Validate category exists
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      // Clean up uploaded images if category invalid
      if (req.files?.length) {
        await Promise.all(req.files.map((f) => deleteImage(f.filename)));
      }
      return res.status(400).json({ message: 'Invalid category.' });
    }

    // Validate slash price logic
    if (slashPrice && parseFloat(slashPrice) <= parseFloat(price)) {
      if (req.files?.length) {
        await Promise.all(req.files.map((f) => deleteImage(f.filename)));
      }
      return res.status(400).json({ message: 'Slash price must be greater than the actual price.' });
    }

    const images = (req.files || []).map((file) => ({
      url: file.path,
      publicId: file.filename,
    }));

    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      slashPrice: slashPrice ? parseFloat(slashPrice) : null,
      category,
      images,
      inStock: inStock === 'true' || inStock === true,
    });

    await product.populate('category', 'name slug');
    res.status(201).json({ message: 'Product created.', product });
  } catch (err) {
    console.error('createProduct error:', err);
    // Clean up images on failure
    if (req.files?.length) {
      await Promise.all(req.files.map((f) => deleteImage(f.filename)));
    }
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/admin/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.files?.length) {
        await Promise.all(req.files.map((f) => deleteImage(f.filename)));
      }
      return res.status(404).json({ message: 'Product not found.' });
    }

    const { name, description, price, slashPrice, category, inStock, removeImages } = req.body;

    // Validate category if being changed
    if (category && category !== product.category.toString()) {
      const categoryDoc = await Category.findById(category);
      if (!categoryDoc) {
        if (req.files?.length) {
          await Promise.all(req.files.map((f) => deleteImage(f.filename)));
        }
        return res.status(400).json({ message: 'Invalid category.' });
      }
    }

    // Validate slash price
    const finalPrice = price ? parseFloat(price) : product.price;
    const finalSlash = slashPrice !== undefined ? (slashPrice ? parseFloat(slashPrice) : null) : product.slashPrice;

    if (finalSlash && finalSlash <= finalPrice) {
      if (req.files?.length) {
        await Promise.all(req.files.map((f) => deleteImage(f.filename)));
      }
      return res.status(400).json({ message: 'Slash price must be greater than the actual price.' });
    }

    // Remove images marked for deletion
    if (removeImages) {
      const toRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
      await Promise.all(toRemove.map((publicId) => deleteImage(publicId)));
      product.images = product.images.filter((img) => !toRemove.includes(img.publicId));
    }

    // Append new images
    if (req.files?.length) {
      const newImages = req.files.map((file) => ({
        url: file.path,
        publicId: file.filename,
      }));
      product.images = [...product.images, ...newImages];
    }

    // Cap at 4 images total
    if (product.images.length > 4) {
      // Remove oldest extras from Cloudinary
      const extras = product.images.slice(4);
      await Promise.all(extras.map((img) => deleteImage(img.publicId)));
      product.images = product.images.slice(0, 4);
    }

    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = parseFloat(price);
    if (slashPrice !== undefined) product.slashPrice = finalSlash;
    if (category) product.category = category;
    if (inStock !== undefined) product.inStock = inStock === 'true' || inStock === true;

    await product.save();
    await product.populate('category', 'name slug');

    res.status(200).json({ message: 'Product updated.', product });
  } catch (err) {
    console.error('updateProduct error:', err);
    if (req.files?.length) {
      await Promise.all(req.files.map((f) => deleteImage(f.filename)));
    }
    res.status(500).json({ message: 'Server error.' });
  }
};

// DELETE /api/admin/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    // Delete all images from Cloudinary
    if (product.images?.length) {
      await Promise.all(product.images.map((img) => deleteImage(img.publicId)));
    }

    await product.deleteOne();
    res.status(200).json({ message: 'Product deleted.' });
  } catch (err) {
    console.error('deleteProduct error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

// PATCH /api/admin/products/:id/toggle-stock
const toggleStock = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    product.inStock = !product.inStock;
    await product.save();

    res.status(200).json({
      message: `Product marked as ${product.inStock ? 'in stock' : 'out of stock'}.`,
      inStock: product.inStock,
    });
  } catch (err) {
    console.error('toggleStock error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, toggleStock };
