const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const router = express.Router();

// POST route for user registration
router.post('/register', async (req, res) => {
  const { fullName, email, password, agreeToTerms } = req.body;

  // Validation for required fields
  if (!fullName || !email || !password || typeof agreeToTerms !== 'boolean') {
    return res.status(400).json({ message: 'All fields are required and must be valid.' });
  }

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user with the default role set to 'user'
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      agreeToTerms,
      role: 'user',  // Set default role to 'user'
    });

    // Save the new user to the database
    await newUser.save();

    // Respond to the client that registration was successful
    res.status(201).json({ message: 'User registered successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT route to burn (deactivate) a user
router.put('/burn/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark the account as burned (deactivated)
    user.burned = true;
    await user.save();

    res.status(200).json({ message: 'User account has been burned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT route to unburn (reactivate) a user
router.put('/unburn/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark the account as unburned (reactivated)
    user.burned = false;
    await user.save();

    res.status(200).json({ message: 'User account has been unburned.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET route to fetch all users
router.get('/', async (req, res) => {
  console.log('Fetching users...');
  try {
    const users = await User.find();
    console.log('Users fetched:', users); // Log the fetched users
    if (!users.length) {
      return res.status(404).json({ message: 'No users found' }); // Return message when no users are found
    }
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;
