const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },
    cvPath: {
      type: String,
      required: true, // Path to the stored CV file
    },
    coverLetter: {
      type: String,
      required: true, // Applicant's message to the employer
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'interviewed', 'rejected', 'hired'], // Make sure 'hired' is included here
      default: 'pending'
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Application', applicationSchema);
