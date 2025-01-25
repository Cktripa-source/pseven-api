const express = require('express');
const multer = require('multer');
const path = require('path');
const Product = require('../models/Product');
const router = express.Router();

// Set up multer storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, './uploads'); // The image should be saved inside 'uploads' folder
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + path.extname(file.originalname)); // Use timestamp to avoid name conflicts
    },
});

// Initialize multer
const upload = multer({ storage });

// Serve static images from the 'uploads' folder
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create a new product with image upload
router.post('/products', upload.single('image'), async (req, res) => {
  const { name, description, price, category, stock } = req.body;
  const image = req.file ? req.file.path.replace('\\', '/') : null; // Get the uploaded image path and format it correctly for URL

  try {
    const newProduct = new Product({
      name,
      description,
      price,
      image, // Save image path to the database
      category,
      stock,
    });

    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a product by id
router.get('/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a product by id with image upload
// Update a product by id with image upload
router.put('/products/:id', upload.single('image'), async (req, res) => {
  const { name, description, price, category, stock } = req.body;

  try {
    // Find the existing product
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update product fields
    product.name = name || product.name;
    product.description = description || product.description;
    product.price = price || product.price;
    product.category = category || product.category;
    product.stock = stock || product.stock;

    // Update the image only if a new one is uploaded
    if (req.file) {
      product.image = req.file.path.replace('\\', '/'); // Update image path
    }

    await product.save();
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a product by id
router.delete('/products/:id', async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
