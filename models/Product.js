const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Price must be a valid number'
    }
  },
  image: { 
    type: String,
    default: null
  },
  imagePublicId: { 
    type: String,
    default: null
  },
  category: { 
    type: String, 
    required: [true, 'Category is required'],
    trim: true
  },
  stock: { 
    type: Number, 
    default: 0,
    min: [0, 'Stock cannot be negative']
  },
  colors: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for checking if product is in stock
ProductSchema.virtual('isInStock').get(function() {
  return this.stock > 0;
});

// Indexing for performance
ProductSchema.index({ name: 'text', category: 1 });
ProductSchema.index({ price: 1, stock: 1 });

module.exports = mongoose.model('Product', ProductSchema);