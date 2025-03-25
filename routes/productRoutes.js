const express = require("express");
const Product = require("../models/Product");
const { authenticate, hasPermission } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/uploadMiddleware');
const { deleteResource } = require('../utils/cloudinary');

const router = express.Router();

// Helper function to parse and validate inputs
const parseProductInput = (body) => {
  const parsedInput = {};

  // String fields
  ['name', 'description', 'category'].forEach(field => {
    if (body[field] !== undefined) {
      parsedInput[field] = body[field];
    }
  });

  // Numeric fields with parsing
  if (body.price !== undefined) {
    const price = parseFloat(body.price);
    if (!isNaN(price) && price >= 0) parsedInput.price = price;
  }

  if (body.stock !== undefined) {
    const stock = parseInt(body.stock, 10);
    if (!isNaN(stock) && stock >= 0) parsedInput.stock = stock;
  }

  // Colors processing
  if (body.colors !== undefined) {
    const colors = Array.isArray(body.colors) 
      ? body.colors 
      : (typeof body.colors === 'string' 
        ? body.colors.split(',').map(color => color.trim())
        : []);
    
    parsedInput.colors = colors.filter(color => color);
  }

  return parsedInput;
};

// Create a new product
router.post("/products", 
  upload.single("image"), 
  uploadToCloudinary('products'), 
  async (req, res) => {
    try {
      // Parse and validate input
      const productData = parseProductInput(req.body);

      // Handle image upload
      if (req.cloudinaryResult) {
        productData.image = req.cloudinaryResult.secure_url;
        productData.imagePublicId = req.cloudinaryResult.public_id;
      }

      // Create and save new product
      const newProduct = new Product(productData);
      await newProduct.save();

      res.status(201).json(newProduct);
    } catch (error) {
      console.error("Product creation error:", error);
      res.status(400).json({ 
        message: "Failed to create product", 
        error: error.message 
      });
    }
  }
);

// Get all products with advanced filtering
router.get("/products", async (req, res) => {
  try {
    const { 
      category, 
      name, 
      minPrice, 
      maxPrice, 
      inStock,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10 
    } = req.query;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: 'i' };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (inStock === 'true') filter.stock = { $gt: 0 };
    if (inStock === 'false') filter.stock = 0;

    // Pagination and sorting
    const options = {
      sort: { [sort]: order === 'desc' ? -1 : 1 },
      limit: parseInt(limit),
      skip: (page - 1) * limit
    };

    // Fetch products
    const products = await Product.find(filter, null, options);
    const total = await Product.countDocuments(filter);

    res.status(200).json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalProducts: total
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: error.message });
  }
});

// Update a product
router.put("/products/:id", 
  upload.single("image"), 
  uploadToCloudinary('products'), 
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Find existing product
      const product = await Product.findById(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Parse input data
      const updateData = parseProductInput(req.body);

      // Handle image upload
      if (req.cloudinaryResult) {
        // Delete previous image if exists
        if (product.imagePublicId) {
          try {
            await deleteResource(product.imagePublicId);
          } catch (deleteError) {
            console.warn('Failed to delete old image:', deleteError);
          }
        }

        // Update with new image
        updateData.image = req.cloudinaryResult.secure_url;
        updateData.imagePublicId = req.cloudinaryResult.public_id;
      }

      // Update product
      const updatedProduct = await Product.findByIdAndUpdate(
        id, 
        updateData, 
        { new: true, runValidators: true }
      );

      res.status(200).json(updatedProduct);
    } catch (error) {
      console.error("Product update error:", error);
      res.status(400).json({ 
        message: "Failed to update product", 
        error: error.message 
      });
    }
  }
);

// Delete a product
router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete Cloudinary image if exists
    if (product.imagePublicId) {
      try {
        await deleteResource(product.imagePublicId);
      } catch (deleteError) {
        console.warn('Failed to delete product image:', deleteError);
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);
    
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Product deletion error:", error);
    res.status(400).json({ 
      message: "Failed to delete product", 
      error: error.message 
    });
  }
});

// Get unique product categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Product.distinct("category", { category: { $ne: null } });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;