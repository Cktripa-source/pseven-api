// routes/requestHelpServiceRoutes.js

const express = require('express');
const RequestHelpService = require('../models/RequestHelpService');
const router = express.Router();

// Create a new request for a service
router.post('/requests', async (req, res) => {
  const { userId, serviceId, additionalNotes } = req.body;

  try {
    const newRequest = new RequestHelpService({
      userId,
      serviceId,
      additionalNotes
    });

    await newRequest.save();
    res.status(201).json(newRequest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get all requests
router.get('/requests', async (req, res) => {
  try {
    const requests = await RequestHelpService.find().populate('userId').populate('serviceId');
    res.status(200).json(requests);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get a request by ID
router.get('/requests/:id', async (req, res) => {
  try {
    const request = await RequestHelpService.findById(req.params.id).populate('userId').populate('serviceId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    res.status(200).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update request status (e.g., mark as In Progress or Completed)
router.put('/requests/:id', async (req, res) => {
  const { status, additionalNotes } = req.body;

  try {
    const request = await RequestHelpService.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = status || request.status;
    request.additionalNotes = additionalNotes || request.additionalNotes;

    await request.save();
    res.status(200).json(request);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a request by ID
router.delete('/requests/:id', async (req, res) => {
  try {
    const deletedRequest = await RequestHelpService.findByIdAndDelete(req.params.id);

    if (!deletedRequest) {
      return res.status(404).json({ message: 'Request not found' });
    }

    res.status(200).json({ message: 'Request deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
