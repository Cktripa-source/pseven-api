const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  image: {
    type: String,
    default: null
  },
  // Add this field to store the Cloudinary public_id
  imagePublicId: {
    type: String,
    default: null
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  stock: {
    type: Number,
    default: 0
  },
  colors: {
    type: [String],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);