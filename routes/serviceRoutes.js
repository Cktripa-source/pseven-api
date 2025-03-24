const express = require('express');
const multer = require('multer');
const path = require('path');
const Service = require('../models/Service');  // Ensure this path is correct
const router = express.Router();

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads'); // Save images in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename using timestamp
  },
});

// Initialize multer
const upload = multer({ storage });

// Serve static images from the 'uploads' folder
router.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Create a new service with image upload
router.post('/services', upload.single('image'), async (req, res) => {
  const { name, description} = req.body;
  const image = req.file ? req.file.path.replace('\\', '/') : null; // Format image path for URL

  try {
    const newService = new Service({
      name,
      description,
      image, // Save the image path to the database
    });

    await newService.save();
    res.status(201).json(newService);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all services
router.get('/', async (req, res) => {
  try {
      const services = await Service.find(); // Adjust according to your data retrieval logic
      res.json(services);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});

// Get a service by id
router.get('/services/:id', async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a service by id with image upload
router.put('/services/:id', upload.single('image'), async (req, res) => {
  const { name, description } = req.body;

  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    service.name = name || service.name;
    service.description = description || service.description;

    if (req.file) {
      service.image = req.file.path.replace('\\', '/'); // Update image path
    }

    await service.save();
    res.status(200).json(service); // ✅ Fixed: return `service` instead of `product`
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// Delete a service by id
router.delete('/services/:id', async (req, res) => {
  try {
    const deletedService = await Service.findByIdAndDelete(req.params.id);

    if (!deletedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
