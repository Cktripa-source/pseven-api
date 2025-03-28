const express = require('express');
const router = express.Router();
const Job = require('../models/Jobs');
const { authenticate, hasPermission } = require('../middleware/auth');
const { createUploadMiddleware, deleteResource } = require('../utils/cloudinary');

// Create upload middleware specific to jobs
const { upload, processUpload } = createUploadMiddleware('jobs');

// GET: Fetch all jobs with optional filtering
router.get('/', async (req, res) => {
  try {
    const { title, location, employmentType, status, skillsRequired } = req.query;
    
    // Build filter object
    const filter = {};
    if (title) filter.title = { $regex: title, $options: 'i' }; // Case-insensitive search
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (employmentType) filter.employmentType = employmentType;
    if (status) filter.status = status;
    if (skillsRequired) {
      const skills = Array.isArray(skillsRequired) ? skillsRequired : skillsRequired.split(',');
      filter.skillsRequired = { $in: skills.map(skill => skill.trim()) };
    }

    const jobs = await Job.find(filter);
    res.status(200).json(jobs);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ message: 'Failed to fetch jobs', error: err.message });
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
    console.error('Error fetching job:', err);
    res.status(500).json({ message: 'Failed to fetch job', error: err.message });
  }
});

// POST: Create a new job
router.post('/', authenticate, hasPermission('canManageJobs'), upload.single('image'), processUpload, async (req, res) => {
  try {
    const { title, description, location, employmentType, skillsRequired, postedBy, status } = req.body;

    // Validate required fields
    if (!title || !description || !location || !employmentType || !postedBy) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Process skillsRequired
    const skills = skillsRequired ? skillsRequired.split(',').map(skill => skill.trim()) : [];

    // Prepare job data object
    const jobData = {
      title,
      description,
      location,
      employmentType,
      skillsRequired: skills,
      postedBy,
      status: status || 'Open',
      // Handle Cloudinary image
      image: req.cloudinaryResult ? req.cloudinaryResult.secure_url : null,
      imagePublicId: req.cloudinaryResult ? req.cloudinaryResult.public_id : null
    };

    const newJob = new Job(jobData);
    await newJob.save();
    
    res.status(201).json({ message: 'Job created successfully', job: newJob });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
});

// PUT: Update a specific job by ID
router.put('/:id', authenticate, hasPermission('canManageJobs'), upload.single('image'), processUpload, async (req, res) => {
  try {
    const existingJob = await Job.findById(req.params.id);
    if (!existingJob) return res.status(404).json({ message: 'Job not found' });

    // Extract job fields from request body
    const { title, description, location, employmentType, skillsRequired, postedBy, status } = req.body;

    // Prepare update data object with only fields that are provided
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (skillsRequired !== undefined) {
      updateData.skillsRequired = skillsRequired.split(',').map(skill => skill.trim());
    }
    if (postedBy !== undefined) updateData.postedBy = postedBy;
    if (status !== undefined) updateData.status = status;

    // Handle image upload if provided
    if (req.cloudinaryResult) {
      // Delete old image from Cloudinary if exists
      if (existingJob.imagePublicId) {
        try {
          await deleteResource(existingJob.imagePublicId);
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }
      
      // Update with new Cloudinary URL and public_id
      updateData.image = req.cloudinaryResult.secure_url;
      updateData.imagePublicId = req.cloudinaryResult.public_id;
    }

    const updatedJob = await Job.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.status(200).json({ message: 'Job updated successfully', job: updatedJob });
  } catch (err) {
    console.error('Error updating job:', err);
    res.status(500).json({ message: 'Failed to update job', error: err.message });
  }
});

// DELETE: Delete a specific job by ID
router.delete('/:id', authenticate, hasPermission('canManageJobs'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Remove image from Cloudinary if exists
    if (job.imagePublicId) {
      console.log('Deleting job image with public_id:', job.imagePublicId);
      await deleteResource(job.imagePublicId);
    }

    // Delete the job from the database
    await Job.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ message: 'Failed to delete job', error: err.message });
  }
});

module.exports = router;
