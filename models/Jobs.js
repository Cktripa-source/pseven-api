const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'],
      required: true,
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    postedBy: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Open', 'Closed'],
      default: 'Open',
    },
    image: {
      type: String, // Store image file paths or URLs
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
