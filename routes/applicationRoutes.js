const express = require('express');
const router = express.Router();
const Application = require('../models/application'); // Import the Application model
const Job = require('../models/Jobs'); // Import the Job model

// GET: Fetch all applications
router.get('/', async (req, res) => {
  try {
    const applications = await Application.find().populate('job', 'title description'); // Populate job details
    res.status(200).json(applications);
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
});

// GET: Fetch applications for a specific job
router.get('/job/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const applications = await Application.find({ job: jobId }).populate('job', 'title description');
    res.status(200).json(applications);
  } catch (err) {
    console.error('Error fetching applications for job:', err);
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
});

// POST: Apply for a specific job
router.post('/:jobId/apply', async (req, res) => {
  const { jobId } = req.params;
  const { fullName, email, cvLink, coverLetter } = req.body;

  try {
    const job = await Job.findById(jobId); // Validate job existence
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const newApplication = new Application({
      job: jobId,
      fullName,
      email,
      cvLink,
      coverLetter,
    });

    await newApplication.save();
    res.status(201).json({ message: 'Application submitted successfully', application: newApplication });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply for job', error: err.message });
  }
});

// DELETE: Delete an application by ID
router.delete('/:id', async (req, res) => {
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
