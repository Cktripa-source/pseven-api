const express = require("express");
const Service = require("../models/Service");
const { createUploadMiddleware, deleteResource } = require('../utils/cloudinary');

const router = express.Router();
const { upload, processUpload } = createUploadMiddleware('services');

// Create a new service with Cloudinary image upload
router.post("/services", upload.single("image"), processUpload, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Log the Cloudinary result for debugging
    console.log('Service creation - Cloudinary result:', req.cloudinaryResult);
    
    const image = req.cloudinaryResult ? req.cloudinaryResult.secure_url : null;
    const imagePublicId = req.cloudinaryResult ? req.cloudinaryResult.public_id : null;

    const newService = new Service({
      name,
      description,
      image,
      imagePublicId
    });

    await newService.save();
    res.status(201).json(newService);
  } catch (error) {
    console.error("Error creating service:", error);
    res.status(400).json({ message: error.message });
  }
});

// Get all services
router.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get a service by ID
router.get("/services/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }
    res.status(200).json(service);
  } catch (error) {
    console.error("Error fetching service:", error);
    res.status(400).json({ message: error.message });
  }
});

// Update a service by ID with Cloudinary image upload
router.put("/services/:id", upload.single("image"), processUpload, async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const { name, description } = req.body;

    // Update service fields if provided
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;

    // Handle image upload if provided
    if (req.cloudinaryResult) {
      console.log('Service update - New Cloudinary image:', req.cloudinaryResult.secure_url);
      
      // Delete old image from Cloudinary if exists
      if (service.imagePublicId) {
        try {
          await deleteResource(service.imagePublicId);
        } catch (deleteError) {
          console.error('Error deleting old image:', deleteError);
        }
      }
      
      // Update with new Cloudinary URL and public_id
      service.image = req.cloudinaryResult.secure_url;
      service.imagePublicId = req.cloudinaryResult.public_id;
    }

    await service.save();
    res.status(200).json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a service by ID
router.delete("/services/:id", async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // Remove image from Cloudinary if exists
    if (service.imagePublicId) {
      console.log('Deleting image with public_id:', service.imagePublicId);
      await deleteResource(service.imagePublicId);
    }

    // Delete service from database
    await Service.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
