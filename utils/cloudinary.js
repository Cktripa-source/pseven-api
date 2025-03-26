// utils/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Create a Cloudinary storage engine for multer
 * @param {string} folder - Folder name in Cloudinary
 * @param {Array} allowedFormats - Array of allowed file formats
 * @returns {CloudinaryStorage} - Configured storage engine
 */
const createCloudinaryStorage = (folder = 'uploads', allowedFormats = ['jpg', 'jpeg', 'png', 'gif']) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      resource_type: 'image', // Set resource type to 'image'
      allowed_formats: allowedFormats,
      public_id: (req, file) => {
        // Generate a unique ID using timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        // Use the original filename without extension for better readability
        const filename = file.originalname.split('.')[0];
        return `${filename}-${uniqueSuffix}`;
      }
    }
  });
};

/**
 * Create a middleware for handling file uploads to Cloudinary
 * @param {string} folder - Folder name in Cloudinary
 * @returns {Function} - Express middleware
 */
const createUploadMiddleware = (folder = 'uploads') => {
  const storage = createCloudinaryStorage(folder);
  const upload = multer({ storage: storage });
  
  // Middleware that processes the upload result
  const processUpload = (req, res, next) => {
    if (!req.file) {
      return next();
    }
    
    // Store the Cloudinary result in the request object
    req.cloudinaryResult = {
      public_id: req.file.filename,
      secure_url: req.file.path,
      resource_type: 'image', // Ensure this is set to 'image'
      format: req.file.originalname.split('.').pop(),
      bytes: req.file.size
    };
    
    next();
  };
  
  return { upload, processUpload };
};

/**
 * Delete a resource from Cloudinary
 * @param {string} publicId - Public ID of the resource
 * @param {Object} options - Deletion options
 * @returns {Promise} - Deletion result
 */
const deleteResource = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'image', // Set to 'image' for image resources
    invalidate: true
  };
  
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(
      publicId,
      { ...defaultOptions, ...options },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
};
// utils/cloudinary.js

const generateSignedUrl = (publicId, options = {}) => {
  // Default options for signed URLs
  const defaultOptions = {
    secure: true,
    resource_type: 'image', // Default to image
    type: 'upload',
    sign_url: true,
    version: Math.round(new Date().getTime() / 1000) // Optional: set version to current time
  };
  
  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};
// Export all the functions
module.exports = {
  cloudinary,
  createUploadMiddleware,
  deleteResource,
  generateSignedUrl // Ensure this is exported
};