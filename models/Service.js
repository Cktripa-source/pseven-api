const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  pricePerTime: { type: String, required: true }, // e.g., "per hour", "per day"
  image: { type: String, required: true }, // URL or path to the image of the service
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Service', serviceSchema);
