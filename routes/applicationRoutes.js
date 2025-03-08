const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Application = require('../models/application'); // Import the Application model
const Job = require('../models/Jobs'); // Import the Job model

// Configure multer storage for CV uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/cvs');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// Configure upload limits and file filter
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

const { authenticate, hasPermission } = require('../middleware/auth');

// GET: Fetch all applications
router.get('/', authenticate, hasPermission('canViewApplications'), async (req, res) => {
  try {
    const applications = await Application.find().populate('job', 'title description'); // Populate job details
    res.status(200).json(applications);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
});

// GET: Fetch applications for a specific job
router.get('/job/:jobId', authenticate, hasPermission('canViewApplications'), async (req, res) => {
  const { jobId } = req.params;
  try {
    const applications = await Application.find({ job: jobId }).populate('job', 'title description');
    res.status(200).json(applications);
  } catch (err) {
    console.error('Error fetching applications for job:', err);
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
});

// POST: Apply for a specific job with CV upload
router.post('/:jobId/apply', upload.single('cv'), async (req, res) => {
  const { jobId } = req.params;
  const { fullName, email, phoneNumber, coverLetter } = req.body;

  try {
    const job = await Job.findById(jobId); // Validate job existence
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    let cvPath = null;
    if (req.file) {
      // If file was uploaded successfully, save the path
      cvPath = `/uploads/cvs/${req.file.filename}`;
    } else {
      return res.status(400).json({ message: 'CV file is required (PDF only)' });
    }

    const newApplication = new Application({
      job: jobId,
      fullName,
      email,
      phoneNumber,
      cvPath,
      coverLetter,
    });

    await newApplication.save();
    res.status(201).json({ message: 'Application submitted successfully', application: newApplication });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply for job', error: err.message });
  }
});

// PUT: Update an application by ID
router.put('/:id', authenticate, hasPermission('canEditApplications'), async (req, res) => {
  const { id } = req.params;
  const { fullName, email, cvLink, coverLetter, status } = req.body;

  try {
    const updatedApplication = await Application.findByIdAndUpdate(
      id,
      { fullName, email, cvLink, coverLetter, status },
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({ message: 'Application updated successfully', application: updatedApplication });
  } catch (err) {
    console.error('Error updating application:', err);
    res.status(500).json({ message: 'Failed to update application', error: err.message });
  }
});

// DELETE: Delete an application by ID
router.delete('/:id', authenticate, hasPermission('canEditApplications'), async (req, res) => {
  const { id } = req.params;
  try {
    const application = await Application.findByIdAndDelete(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.status(200).json({ message: 'Application deleted successfully', application });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ message: 'Failed to delete application', error: err.message });
  }
});

module.exports = router;
