// middleware/uploadMiddleware.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile } = require('../utils/cloudinary');
const { logger } = require('../utils/logger');

// Configure multer for temporary storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Create multer upload middleware
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const allowedFileTypes = {
      'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'document': ['.pdf', '.doc', '.docx'],
      'video': ['.mp4', '.mov', '.avi'],
      'cv': ['.pdf', '.doc', '.docx'] // Specific CV file types
    };
    
    // Check if the file extension is allowed
    const ext = path.extname(file.originalname).toLowerCase();
    const fileType = req.query.fileType || 'image'; // Default to image
    
    if (allowedFileTypes[fileType] && allowedFileTypes[fileType].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types for ${fileType}: ${allowedFileTypes[fileType].join(', ')}`));
    }
  }
});

// CV-specific upload middleware
const cvUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for CVs
  },
  fileFilter: (req, file, cb) => {
    // Only allow PDF, DOC, and DOCX for CVs
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed for CVs.'));
    }
  }
});

// Middleware to upload file to Cloudinary after multer saves it locally
// In your uploadMiddleware.js file or wherever uploadToCloudinary is defined
const uploadToCloudinary = (folder) => {
  return async (req, res, next) => {
    if (!req.file) {
      return next();
    }

    try {
      // For CV uploads, allow PDF file type
      if (folder === 'cvs') {
        // Use the uploadFile function you imported instead of cloudinary directly
        const result = await uploadFile(req.file.path, {
          folder,
          resource_type: 'auto', // This is important for PDFs
          allowed_formats: ['pdf', 'doc', 'docx'] // Allow document formats
        });
        req.cloudinaryResult = result;
        fs.unlinkSync(req.file.path); // Remove temp file
        return next();
      }
      
      // For other uploads (like images)
      const result = await uploadFile(req.file.path, {
        folder,
        // Your existing image-only configuration
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
      });
      
      req.cloudinaryResult = result;
      fs.unlinkSync(req.file.path); // Remove temp file
      next();
    } catch (error) {
      // Clean up the temp file in case of error
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(500).json({ 
        error: 'Upload failed', 
        message: error.message,
        stack: error.stack 
      });
    }
  };
};

// Multiple files upload to Cloudinary middleware
const uploadMultipleToCloudinary = (folderName = '') => {
  return async (req, res, next) => {
    // If no files were uploaded, continue
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    try {
      const uploadPromises = req.files.map(async (file) => {
        try {
          const result = await uploadFile(file.path, {
            folder: folderName,
            resource_type: 'auto'
          });
          
          // Clean up the temporary file
          fs.unlinkSync(file.path);
          
          return {
            originalName: file.originalname,
            publicId: result.public_id,
            url: result.secure_url,
            format: result.format,
            size: result.bytes,
            width: result.width,
            height: result.height,
            resourceType: result.resource_type
          };
        } catch (error) {
          // Clean up the local file in case of error
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          throw error;
        }
      });
      
      req.cloudinaryResults = await Promise.all(uploadPromises);
      next();
    } catch (error) {
      logger.error(`Error uploading multiple files to Cloudinary: ${error.message}`);
      next(error);
    }
  };
};

module.exports = {
  upload,
  cvUpload,
  uploadToCloudinary,
  uploadMultipleToCloudinary
};