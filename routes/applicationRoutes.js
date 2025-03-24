const express = require('express');
const router = express.Router();
const multer = require('multer');
const Application = require('../models/application');
const Job = require('../models/Jobs');
const { upload, uploadToCloudinary } = require('../middleware/uploadMiddleware');
const { authenticate, hasPermission } = require('../middleware/auth');
const { deleteResource, cloudinary } = require('../utils/cloudinary'); // Import cloudinary too

// GET: Fetch all applications
router.get('/', authenticate, hasPermission('canViewApplications'), async (req, res) => {
  try {
    const applications = await Application.find().populate('job', 'title description');
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

// POST: Apply for a specific job with CV upload to Cloudinary
router.post('/:jobId/apply', 
  upload.single('cvFile'), // Change back to 'cvFile' to match frontend
  uploadToCloudinary('cvs'),
  async (req, res) => {
    const { jobId } = req.params;
    const { fullName, email, personPhone, coverLetter } = req.body;
    
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      // Check if upload to Cloudinary was successful
      if (!req.file || !req.cloudinaryResult) {
        return res.status(400).json({ message: 'CV file is required (PDF only)' });
      }

      const newApplication = new Application({
        job: jobId,
        fullName,
        email,
        phoneNumber: personPhone,
        cvPath: req.cloudinaryResult.secure_url, // Store Cloudinary URL
        cvPublicId: req.cloudinaryResult.public_id, // Store public ID for future reference
        coverLetter: coverLetter || "No cover letter provided",
      });
      
      await newApplication.save();
      res.status(201).json({ 
        message: 'Application submitted successfully', 
        application: newApplication 
      });
    } catch (err) {
      console.error('Error creating application:', err);
      res.status(500).json({ message: 'Failed to apply for job', error: err.message });
    }
  }
);

// PATCH: Update application status only
router.patch('/:id', authenticate, hasPermission('canEditApplications'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Only update the status field
    const updatedApplication = await Application.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({ message: 'Application not found' });
    }

    res.status(200).json({ 
      message: 'Application status updated successfully', 
      application: updatedApplication 
    });
  } catch (err) {
    console.error('Error updating application status:', err);
    res.status(500).json({ message: 'Failed to update application status', error: err.message });
  }
});

// PUT: Update an application by ID
router.put('/:id', authenticate, hasPermission('canEditApplications'), async (req, res) => {
  const { id } = req.params;
  const { fullName, email, coverLetter, status } = req.body;

  try {
    const updatedApplication = await Application.findByIdAndUpdate(
      id,
      { fullName, email, coverLetter, status },
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
    // First find the application to get its Cloudinary public ID
    const application = await Application.findById(id);
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    // Delete the CV file from Cloudinary if it exists
    if (application.cvPublicId) {
      try {
        // Make sure we have the full public ID including folder
        let publicId = application.cvPublicId;
        // If the publicId doesn't include the 'cvs/' prefix, add it
        if (!publicId.includes('cvs/')) {
          publicId = `cvs/${publicId}`;
        }
        
        // Using the delete_resources API method to match the example from Cloudinary Media Explorer
        const deleteResult = await cloudinary.api.delete_resources(
          [publicId], 
          { 
            type: 'upload', 
            resource_type: 'image' // Using 'image' instead of 'raw' based on your Media Explorer
          }
        );
        
        console.log(`Deleted CV from Cloudinary: ${publicId}`, deleteResult);
      } catch (cloudinaryErr) {
        console.error('Error deleting file from Cloudinary:', cloudinaryErr);
        // Continue with application deletion even if Cloudinary deletion fails
      }
    }
    
    // Delete the application from database
    await Application.findByIdAndDelete(id);
    
    res.status(200).json({ 
      message: 'Application and associated CV deleted successfully', 
      application 
    });
  } catch (err) {
    console.error('Error deleting application:', err);
    res.status(500).json({ message: 'Failed to delete application', error: err.message });
  }
});

module.exports = router;