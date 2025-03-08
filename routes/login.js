const express = require('express');
const User = require('../models/user');
const bcrypt = require('bcryptjs'); // Switch to bcryptjs
const jwt = require('jsonwebtoken');

const router = express.Router();

const { loginValidation } = require('../middleware/validation');

// POST: /api/auth/login
router.post('/', loginValidation, async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the user is burned (account is deactivated)
    if (user.burned) {
      return res.status(403).json({ message: 'This account has been deactivated.' });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate an access token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'pseven!123',
      { 
        expiresIn: '1h',
        issuer: 'p-seven-api',
        audience: 'p-seven-client' 
      }
    );
    
    // Generate a refresh token
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET || 'pseven-refresh!123',
      { expiresIn: '7d' }
    );

    // Send response with tokens and user info
    res.status(200).json({ 
      token,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
