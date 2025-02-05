const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number, 
    required: true,
  },
  image: {
    type: String,
  },
  category: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  colors: {
    type: [String],
    default: []  // Default to an empty array if not provided
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
