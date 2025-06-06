// models/Product.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String },
  imagePublicId: { type: String },
  category: { type: String },
  stock: { type: Number, default: 0 },
  colors: { type: [String], default: [] },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;