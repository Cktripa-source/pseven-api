const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Product = require("../models/Product");

const router = express.Router();

// Ensure the 'uploads' folder exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Ensure images are saved inside 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Avoid name conflicts
  },
});

// Initialize multer
const upload = multer({ storage });

// Serve static images from the 'uploads' folder
router.use("/uploads", express.static(uploadDir));

// Create a new product with image upload
router.post("/products", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category, stock, colors } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null; // Format correct URL path

    const newProduct = new Product({
      name,
      description,
      price: parseFloat(price), // Ensure price is a number
      image, // Save relative image path
      category,
      stock: parseInt(stock, 10) || 0, // Ensure stock is a number
      colors: colors ? colors.split(",").map(color => color.trim()) : [], // Convert colors to array and trim
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(400).json({ message: error.message });
  }
});

// Get all products (supports filtering by category)
router.get("/products", async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const products = await Product.find(query);
    res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(400).json({ message: error.message });
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

// Update a product by ID with image upload
router.put("/products/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category, stock, colors } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Update product fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price ? parseFloat(price) : product.price;
    product.category = category || product.category;
    product.stock = stock ? parseInt(stock, 10) : product.stock;
    product.colors = colors ? colors.split(",").map(color => color.trim()) : product.colors;

    // Update the image only if a new one is uploaded
    if (req.file) {
      product.image = `/uploads/${req.file.filename}`;
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
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete image file if it exists
    if (deletedProduct.image) {
      const imagePath = path.join(__dirname, "..", deletedProduct.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

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
