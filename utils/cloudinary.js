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
const createCloudinaryStorage = (folder = 'uploads', allowedFormats = ['pdf', 'doc', 'docx']) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder,
      resource_type: 'raw',
      allowed_formats: allowedFormats,
      format: 'auto',
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
 * Upload a file to Cloudinary
 * @param {string} filePath - Path to the local file
 * @param {Object} options - Upload options
 * @returns {Promise} - Upload result
 */
const uploadFile = (filePath, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      resource_type: 'auto',
      folder: 'uploads'
    };
    
    cloudinary.uploader.upload(
      filePath, 
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

/**
 * Generate a signed URL for a Cloudinary resource
 * @param {string} publicId - Public ID of the resource
 * @param {Object} options - URL generation options
 * @returns {string} - Signed URL
 */
const generateSignedUrl = (publicId, options = {}) => {
  // Default options for signed URLs
  const defaultOptions = {
    secure: true,
    resource_type: 'auto',
    type: 'upload',
    sign_url: true,
    version: Math.round(new Date().getTime() / 1000)
  };
  
  return cloudinary.url(publicId, { ...defaultOptions, ...options });
};

/**
 * Generate a URL with transformations for images
 * @param {string} publicId - Public ID of the image
 * @param {Object} transformations - Image transformations
 * @returns {string} - Transformed image URL
 */
const generateImageUrl = (publicId, transformations = {}) => {
  // Default transformations for optimized images
  const defaultTransformations = {
    fetch_format: 'auto',
    quality: 'auto',
    dpr: 'auto'
  };
  
  return cloudinary.url(publicId, { 
    secure: true,
    transformation: { ...defaultTransformations, ...transformations } 
  });
};

/**
 * Verify if a resource exists in Cloudinary
 * @param {string} publicId - Public ID of the resource
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {Promise} - Resource information or error
 */
const verifyResource = (publicId, resourceType = 'raw') => {
  return new Promise((resolve, reject) => {
    cloudinary.api.resource(
      publicId,
      { resource_type: resourceType },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
};

/**
 * Delete a resource from Cloudinary
 * @param {string} publicId - Public ID of the resource
 * @param {Object} options - Deletion options
 * @returns {Promise} - Deletion result
 */
const deleteResource = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'auto',
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
      resource_type: req.file.mimetype.startsWith('image/') ? 'image' : 
                    req.file.mimetype.startsWith('video/') ? 'video' : 'raw',
      format: req.file.originalname.split('.').pop(),
      bytes: req.file.size
    };
    
    next();
  };
  
  return { upload, processUpload };
};

/**
 * Fix publicId if it has been extracted incorrectly
 * This handles cases where folder structure might be missing
 * @param {string} publicId - Public ID of the resource
 * @param {string} defaultFolder - Default folder to prepend if needed
 * @returns {string} - Corrected public ID
 */
const fixPublicId = (publicId, defaultFolder = null) => {
  // If publicId already has a folder structure, return as is
  if (publicId.includes('/')) {
    return publicId;
  }
  
  // If a default folder is provided and the publicId doesn't have it, prepend it
  if (defaultFolder && !publicId.startsWith(`${defaultFolder}/`)) {
    return `${defaultFolder}/${publicId}`;
  }
  
  return publicId;
};

/**
 * Get a direct access URL for a resource (unsigned, for public resources)
 * @param {string} publicId - Public ID of the resource
 * @param {string} resourceType - Resource type (image, video, raw)
 * @returns {string} - Direct URL
 */
const getDirectUrl = (publicId, resourceType = 'raw') => {
  return cloudinary.url(publicId, {
    secure: true,
    resource_type: resourceType
  });
};

/**
 * Create a signed URL specifically for CVs and documents
 * @param {string} publicId - Public ID of the document
 * @returns {string} - Signed URL for document access
 */
const getDocumentUrl = (publicId) => {
  // Check if we need to add the cvs folder prefix
  const fixedPublicId = publicId.includes('/') ? publicId : `cvs/${publicId}`;
  
  return generateSignedUrl(fixedPublicId, {
    resource_type: 'raw',
    format: 'pdf',
    attachment: true
  });
};

// Export all the functions
module.exports = {
  cloudinary,
  uploadFile,
  generateSignedUrl,
  generateImageUrl,
  verifyResource,
  deleteResource,
  createUploadMiddleware,
  fixPublicId,
  getDirectUrl,
  getDocumentUrl
};