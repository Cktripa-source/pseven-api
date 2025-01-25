const express = require('express');
const router = express.Router();
const Job = require('../models/Jobs'); // Import the Job model

// POST: Create a new job
router.post('/', async (req, res) => {
    try {
      const jobData = req.body;
      console.log('Job data received:', jobData); // Log the incoming data
      const newJob = new Job(jobData);
      await newJob.save(); // Save the job to the database
      res.status(201).json({ message: 'Job created successfully', job: newJob });
    } catch (error) {
      console.error('Error creating job:', error); // Log the exact error
      res.status(500).json({ message: 'Failed to create job', error: error.message }); // Include error details in response
    }
  });
  

// GET: Fetch all jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find();
    res.status(200).json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// GET: Fetch a specific job by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch job' });
  }
});

// PUT: Update a specific job
router.put('/:id', async (req, res) => {
  const { title, description, location, requirements } = req.body;

  try {
    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id,
      { title, description, location, requirements },
      { new: true }
    );
    if (!updatedJob) {
      return res.status(404).json({ message: 'Job not found' });
    } 
    res.status(200).json({ message: 'Job updated successfully', job: updatedJob });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update job' });
  }
});

// DELETE: Delete a specific job
router.delete('/:id', async (req, res) => {
  try {
    const deletedJob = await Job.findByIdAndDelete(req.params.id);
    if (!deletedJob) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete job' });
  }
});

module.exports = router;
