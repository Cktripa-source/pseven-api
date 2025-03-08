const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authenticate, isAdmin, hasPermission } = require('../middleware/auth');
const router = express.Router();

const { registerValidation } = require('../middleware/validation');

// POST route for user registration
router.post('/register', registerValidation, async (req, res) => {
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
      permissions: {
        canManageUsers: false,
        canManageJobs: false,
        canManageProducts: false,
        canManageServices: false,
        canViewApplications: false,
        canEditApplications: false
      }
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

// POST route for admin to create a user with specific role and permissions
router.post('/create-user', authenticate, isAdmin, async (req, res) => {
  const { fullName, email, password, role, permissions } = req.body;

  try {
    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the new user with specified role and permissions
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      agreeToTerms: true,
      role: role || 'user',
      permissions: permissions || {
        canManageUsers: false,
        canManageJobs: false,
        canManageProducts: false,
        canManageServices: false,
        canViewApplications: false,
        canEditApplications: false
      }
    });

    // Save the new user to the database
    await newUser.save();

    // Respond to the client that user creation was successful
    res.status(201).json({ message: 'User created successfully', user: newUser });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST route for refreshing tokens
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token is required' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'pseven-refresh!123');
    
    // Find user 
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.burned) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }
    
    // Generate new tokens
    const newAccessToken = jwt.sign(
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
    
    res.status(200).json({ 
      token: newAccessToken,

// POST route for requesting password reset
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // For security, don't reveal if the user exists
      return res.status(200).json({ message: 'If an account with that email exists, a reset link will be sent' });
    }
    
    // Create a password reset token
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.RESET_TOKEN_SECRET || 'pseven-reset!123',
      { expiresIn: '15m' }
    );
    
    // In a real application, you would send an email with the token
    // For now, just return the token in the response
    res.status(200).json({
      message: 'If an account with that email exists, a reset link will be sent',
      // In production, remove this line and actually send an email
      resetToken
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST route for resetting password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: 'Reset token and new password are required' });
  }
  
  try {
    const decoded = jwt.verify(resetToken, process.env.RESET_TOKEN_SECRET || 'pseven-reset!123');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update the user's password
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

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
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
});


// PUT route to update user role and permissions
router.put('/update-role/:id', authenticate, isAdmin, async (req, res) => {
  const userId = req.params.id;
  const { role, permissions } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (role) user.role = role;
    if (permissions) user.permissions = { ...user.permissions, ...permissions };
    
    await user.save();

    res.status(200).json({ message: 'User role and permissions updated successfully', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT route to burn (deactivate) a user
router.put('/burn/:id', authenticate, hasPermission('canManageUsers'), async (req, res) => {
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

// POST route to initialize default permissions for users (admin only)
router.post('/initialize-permissions', authenticate, isAdmin, async (req, res) => {
  try {
    // Set default permissions based on existing roles
    const users = await User.find();
    let updateCount = 0;
    
    for (const user of users) {
      // Skip users that already have permissions set
      if (user.permissions && Object.keys(user.permissions).length > 0) {
        continue;
      }
      
      let permissions = {
        canManageUsers: false,
        canManageJobs: false,
        canManageProducts: false,
        canManageServices: false,
        canViewApplications: false,
        canEditApplications: false
      };
      
      // Set permissions based on role
      if (user.role === 'admin') {
        // Admins have all permissions
        Object.keys(permissions).forEach(key => permissions[key] = true);
      } else if (user.role === 'manager') {
        // Managers can manage jobs, products, services and view applications
        permissions.canManageJobs = true;
        permissions.canManageProducts = true;
        permissions.canManageServices = true;
        permissions.canViewApplications = true;
      } else if (user.role === 'editor') {
        // Editors can manage products and view applications
        permissions.canManageProducts = true;
        permissions.canViewApplications = true;
      } else if (user.role === 'viewer') {
        // Viewers can only view applications
        permissions.canViewApplications = true;
      }
      
      user.permissions = permissions;
      await user.save();
      updateCount++;
    }
    
    res.status(200).json({ 
      message: 'User permissions initialized successfully', 
      updatedUsers: updateCount 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

});

// PUT route to unburn (reactivate) a user
router.put('/unburn/:id', authenticate, hasPermission('canManageUsers'), async (req, res) => {
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
router.get('/', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  console.log('Fetching users...');
  try {
    const users = await User.find().select('-password'); // Exclude password from results
    console.log('Users fetched:', users.length); // Log count of fetched users
    if (!users.length) {
      return res.status(404).json({ message: 'No users found' }); // Return message when no users are found
    }
    res.status(200).json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// GET route to get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
