const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary, uploadMultipleToCloudinary } = require('../middleware/uploadMiddleware');

// Single file upload route
router.post('/file', upload.single('file'), uploadToCloudinary('uploads'), (req, res) => {
  try {
    if (!req.cloudinaryResult) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    return res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        url: req.cloudinaryResult.secure_url,
        publicId: req.cloudinaryResult.public_id,
        format: req.cloudinaryResult.format,
        size: req.cloudinaryResult.bytes
      }
    });
  } catch (error) {
    console.error(`Error in file upload: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Multiple files upload route
router.post('/multiple', upload.array('files', 10), uploadMultipleToCloudinary('uploads'), (req, res) => {
  try {
    if (!req.cloudinaryResults || req.cloudinaryResults.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    return res.status(200).json({
      message: 'Files uploaded successfully',
      count: req.cloudinaryResults.length,
      files: req.cloudinaryResults
    });
  } catch (error) {
    console.error(`Error in multiple file upload: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
});

// Upload route with dynamic folder
router.post('/:folder', upload.single('file'), (req, res, next) => {
  const folder = req.params.folder;
  // Validate folder name to prevent security issues
  const validFolders = ['products', 'profiles', 'documents', 'others'];
  
  if (!validFolders.includes(folder)) {
    return res.status(400).json({ 
      error: 'Invalid folder specified',
      message: `Folder must be one of: ${validFolders.join(', ')}`
    });
  }
  
  // Use the middleware with the dynamic folder
  uploadToCloudinary(folder)(req, res, next);
}, (req, res) => {
  if (!req.cloudinaryResult) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  return res.status(200).json({
    message: `File uploaded successfully to ${req.params.folder}`,
    file: {
      url: req.cloudinaryResult.secure_url,
      publicId: req.cloudinaryResult.public_id,
      format: req.cloudinaryResult.format,
      size: req.cloudinaryResult.bytes
    }
  });
});

module.exports = router;