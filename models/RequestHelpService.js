const mongoose = require('mongoose');

const requestHelpServiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }, // Reference to Service
  requestedAt: { type: Date, default: Date.now }, // Timestamp when the request was made
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Completed'], 
    default: 'Pending' 
  }, // Status of the service request
  additionalNotes: { type: String }, // Optional notes provided by the user
});

module.exports = mongoose.model('RequestHelpService', requestHelpServiceSchema);
