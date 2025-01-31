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
    type: Number,  // Numeric price for calculations
    required: true,
  },
  image: {
    type: String,  // Path to image file
  },
  category: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,  // Total stock available for this product
    required: true,
  },
  colors: {
    type: [String],  // Array of available colors (e.g., ["black", "gold", "blue"])
    required: true,
  },
  quantityByColor: {
    type: Map,  // Stores quantity for each color
    of: Number,  // Each color has a corresponding quantity
    required: true,
    default: {}
  }
}, { timestamps: true });  // Automatically add createdAt and updatedAt fields

module.exports = mongoose.model('Product', productSchema);
