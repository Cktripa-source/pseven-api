const express = require('express');
const router = express.Router();
const { upload, uploadToCloudinary, uploadMultipleToCloudinary } = require('../middleware/uploadMiddleware');
const { authenticate } = require('../middleware/auth');
const { generateSignedUrl } = require('../utils/cloudinary');

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
    return res.status(500).json({ error: 'Internal server error' });
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload route with dynamic folder
router.post('/:folder', upload.single('file'), (req, res, next) => {
  const folder = req.params.folder;
  const validFolders = ['products', 'profiles', 'documents', 'others'];

  // Validate folder name to prevent security issues
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

// Get signed URL for a Cloudinary resource
// Get signed URL for a Cloudinary resource
router.get('/get-signed-url', authenticate, async (req, res) => {
  const { publicId, resourceType } = req.query;

  if (!publicId || !resourceType) {
    return res.status(400).json({ error: 'publicId and resourceType are required' });
  }

  console.log('Received publicId:', publicId);
  console.log('Received resourceType:', resourceType);

  try {
    const signedUrl = generateSignedUrl(publicId, { resource_type: resourceType });
    console.log('Generated signed URL:', signedUrl);
    res.status(200).json({ url: signedUrl });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

module.exports = router;