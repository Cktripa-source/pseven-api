const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true }, // Price for the service
  pricePerTime: { type: String, required: true }, // e.g., "per hour", "per day"
  image: { type: String, required: true }, // URL or path to the image of the service
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Service', serviceSchema);
