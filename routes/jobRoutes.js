const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Job = require('../models/Jobs');
const { authenticate, hasPermission } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../middleware/uploadMiddleware');
const { deleteResource } = require('../utils/cloudinary');

// Configure multer for file uploads (temporary local storage)
const jobUploadDir = path.join(__dirname, '..', 'uploads/jobs');
if (!fs.existsSync(jobUploadDir)) {
  fs.mkdirSync(jobUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, jobUploadDir),
  filename: (req, file, cb) => cb(null, `job-${Date.now()}${path.extname(file.originalname)}`),
});

const uploadImage = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const fileTypes = /jpeg|jpg|png|gif/;
    const isValid = fileTypes.test(path.extname(file.originalname).toLowerCase()) 
                    && fileTypes.test(file.mimetype);
    
    if (isValid) return cb(null, true);
    cb(new Error('Invalid file type. Only images are allowed.'));
  },
});

// GET: Fetch all jobs with optional filtering
router.get('/', async (req, res) => {
  try {
    // Extract filter parameters from query string
    const { title, location, employmentType, status, skillsRequired } = req.query;
    
    // Build filter object
    const filter = {};
    if (title) filter.title = { $regex: title, $options: 'i' }; // Case-insensitive search
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (employmentType) filter.employmentType = employmentType;
    if (status) filter.status = status;
    if (skillsRequired) {
      // Handle skills as comma-separated list
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

// POST: Create a new job with all fields and image upload
router.post('/', authenticate, hasPermission('canManageJobs'), uploadImage.single('image'), uploadToCloudinary('jobs'), async (req, res) => {
  try {
    // Extract all job fields from request body
    const { 
      title, 
      description, 
      location, 
      employmentType, 
      skillsRequired, 
      postedBy, 
      status 
    } = req.body;

    // Validate required fields
    if (!title || !description || !location || !employmentType || !postedBy) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['title', 'description', 'location', 'employmentType', 'postedBy'] 
      });
    }

    // Process skillsRequired from string to array if needed
    const skills = Array.isArray(skillsRequired) 
      ? skillsRequired 
      : skillsRequired ? skillsRequired.split(',').map(skill => skill.trim()) : [];

    // Prepare job data object
    const jobData = {
      title,
      description,
      location,
      employmentType,
      skillsRequired: skills,
      postedBy,
      status: status || 'Open', // Default to 'Open' if not specified
      image: req.cloudinaryResult ? req.cloudinaryResult.secure_url : null,
    };

    const newJob = new Job(jobData);
    await newJob.save();
    
    res.status(201).json({ 
      message: 'Job created successfully', 
      job: newJob 
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
});

// PUT: Update a specific job with all fields and image upload
router.put('/:id', authenticate, hasPermission('canManageJobs'), uploadImage.single('image'), uploadToCloudinary('jobs'), async (req, res) => {
  try {
    const existingJob = await Job.findById(req.params.id);
    if (!existingJob) return res.status(404).json({ message: 'Job not found' });

    // Extract all job fields from request body
    const { 
      title, 
      description, 
      location, 
      employmentType, 
      skillsRequired, 
      postedBy, 
      status 
    } = req.body;

    // Process skillsRequired from string to array if needed
    const skills = skillsRequired !== undefined ? (
      Array.isArray(skillsRequired) 
        ? skillsRequired 
        : skillsRequired.split(',').map(skill => skill.trim())
    ) : undefined;

    // Prepare update data object with only fields that are provided
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (employmentType !== undefined) updateData.employmentType = employmentType;
    if (skills !== undefined) updateData.skillsRequired = skills;
    if (postedBy !== undefined) updateData.postedBy = postedBy;
    if (status !== undefined) updateData.status = status;

    // Handle image upload if provided
    if (req.cloudinaryResult) {
      updateData.image = req.cloudinaryResult.secure_url;

      // Remove old image from Cloudinary if exists
      if (existingJob.image) {
        const publicId = existingJob.image.split('/').pop().split('.')[0];
        await deleteResource(publicId);
      }
    }

    const updatedJob = await Job.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true } // Return the updated document
    );
    
    res.status(200).json({ 
      message: 'Job updated successfully', 
      job: updatedJob 
    });
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

    // Remove associated image from Cloudinary if it exists
    if (job.image) {
      const publicId = job.image.split('/').pop().split('.')[0]; // Extract public_id from image URL
      await deleteResource(publicId); // Delete image from Cloudinary
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