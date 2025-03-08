
const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { authenticate, hasPermission } = require('../middleware/auth');
const { validateContactInput } = require('../middleware/validation');

// Submit a contact form
router.post('/', validateContactInput, async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    const newContact = new Contact({
      name,
      email,
      phone,
      subject,
      message
    });
    
    const savedContact = await newContact.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Your message has been sent successfully. We will get back to you soon.',
      id: savedContact._id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all contact messages (admin only)
router.get('/', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    
    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get contact by ID (admin only)
router.get('/:id', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found' });
    }
    
    // Mark as read if it's new
    if (contact.status === 'New') {
      contact.status = 'Read';
      await contact.save();
    }
    
    res.status(200).json(contact);
  } catch (error) {
    console.error('Error fetching contact message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contact status (admin only)
router.put('/:id', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  try {
    const { status } = req.body;
    
    const contact = await Contact.findById(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found' });
    }
    
    contact.status = status;
    const updatedContact = await contact.save();
    
    res.status(200).json(updatedContact);
  } catch (error) {
    console.error('Error updating contact message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete contact (admin only)
router.delete('/:id', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found' });
    }
    
    res.status(200).json({ message: 'Contact message deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
