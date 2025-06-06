// routes/products.js

const express = require("express");
const Product = require("../models/Product");
const { createUploadMiddleware, deleteResource } = require('../utils/cloudinary'); // Import deleteResource

const router = express.Router();
const { upload, processUpload } = createUploadMiddleware('products');

// Create a new product with Cloudinary image upload
router.post("/products", upload.single("image"), processUpload, async (req, res) => {
  try {
    const { name, description, price, category, stock, colors } = req.body;
    
    // Log the Cloudinary result for debugging
    console.log('Product creation - Cloudinary result:', req.cloudinaryResult);
    
    const image = req.cloudinaryResult ? req.cloudinaryResult.secure_url : null;
    const imagePublicId = req.cloudinaryResult ? req.cloudinaryResult.public_id : null;

    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price),
      image,
      imagePublicId,
      category,
      stock: parseInt(stock, 10) || 0,
      colors: colors ? colors.split(",").map(color => color.trim()) : [],
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ message: error.message });
  }
});

// Get all products (supports filtering by category and name)
router.get("/products", async (req, res) => {
  try {
    const { category, name } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (name) filter.name = { $regex: name, $options: 'i' }; // Case-insensitive search
    
    const products = await Product.find(filter);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get a product by ID
router.get("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(400).json({ message: error.message });
  }
});

// Update a product by ID with Cloudinary image upload
router.put("/products/:id", upload.single("image"), processUpload, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { name, description, price, category, stock, colors } = req.body;

    // Update product fields if provided
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = parseInt(stock, 10);
    if (colors !== undefined) {
      product.colors = colors.split(",").map(color => color.trim());
    }

    // Handle image upload if provided
    if (req.cloudinaryResult) {
      console.log('Product update - New Cloudinary image:', req.cloudinaryResult.secure_url);
      
      // Update with new Cloudinary URL and public_id
      product.image = req.cloudinaryResult.secure_url;
      product.imagePublicId = req.cloudinaryResult.public_id;
    }

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a product by ID
router.delete("/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Remove image from Cloudinary if exists
    if (product.imagePublicId) {
      console.log('Deleting image with public_id:', product.imagePublicId);
      await deleteResource(product.imagePublicId); // Use deleteResource function
    }

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(400).json({ message: error.message });
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