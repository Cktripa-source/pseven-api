const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { authenticate, isAdmin, hasPermission } = require('../middleware/auth');
const router = express.Router();

const { registerValidation } = require('../middleware/validation');

// Add verifyToken middleware
const verifyToken = (req, res, next) => {
  // Get token from authorization header
  const authHeader = req.headers.authorization;
  
  // Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  // Extract the token (remove "Bearer " prefix)
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pseven!123');
    
    // Set user data in request object
    req.user = decoded;
    req.userId = decoded.id;
    
    // Continue to the next middleware/route handler
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

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

// POST route for login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find the user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if the account is burned (deactivated)
    if (user.burned) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate tokens
    const accessToken = jwt.sign(
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
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET || 'pseven-refresh!123',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ 
      token: accessToken,
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

// GET route to get current user info (first /me route using verifyToken)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error in GET /api/auth/me:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST route for admin to create a user with specific role and permissions
router.post('/create-user', authenticate, isAdmin, async (req, res) => {
  const { fullName, email, password, role, permissions } = req.body;

  // Validate required fields
  if (!fullName || !email || !password) {
    return res.status(400).json({ message: 'Full name, email, and password are required.' });
  }

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
    res.status(201).json({ 
      message: 'User created successfully', 
      user: {
        id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        permissions: newUser.permissions
      }
    });

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

// POST route for logout (token invalidation would normally be implemented here)
router.post('/logout', authenticate, async (req, res) => {
  // In a real application, you would invalidate the refresh token here
  // For now, just return success
  res.status(200).json({ message: 'Logged out successfully' });
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

    res.status(200).json({ 
      message: 'User role and permissions updated successfully', 
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

// PUT route for user to update their own profile
router.put('/update-profile', authenticate, async (req, res) => {
  const { fullName, email } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update fields if provided
    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      // Check if the new email is already in use
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      user.email = email;
    }
    
    await user.save();
    
    res.status(200).json({ 
      message: 'Profile updated successfully',
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

// PUT route for user to change their password
router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash and update the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.status(200).json({ message: 'Password changed successfully' });
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

    // Prevent burning an admin account if the requester is not an admin
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You do not have permission to deactivate an admin account' });
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

// GET route to fetch all users
router.get('/', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  try {
    // Add query parameters for filtering and pagination
    const { role, burned, page = 1, limit = 10 } = req.query;
    
    // Build query filters
    const filter = {};
    if (role) filter.role = role;
    if (burned !== undefined) filter.burned = burned === 'true';
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count for pagination
    const totalUsers = await User.countDocuments(filter);
    
    // Fetch users with pagination
    const users = await User.find(filter)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    if (!users.length) {
      return res.status(404).json({ message: 'No users found' });
    }
    
    res.status(200).json({
      users,
      pagination: {
        total: totalUsers,
        page: parseInt(page),
        pages: Math.ceil(totalUsers / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});
// Add this route to your auth routes (in paste-3.txt)
// Add this right after the /me route

// GET route to get current user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error in GET /api/auth/profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET route to get a specific user by ID
// Add this route *before* the '/:id' route
router.get('/check', async (req, res) => {
  try {
    // This is a simple endpoint to verify that authentication routes are working
    res.status(200).json({ status: 'ok', message: 'Authentication service is running' });
  } catch (error) {
    console.error('Error in GET /api/auth/check:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/:id', authenticate, hasPermission('canManageUsers'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE route for admin to delete a user
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent deleting another admin (only super admins might have this capability)
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted through this endpoint' });
    }
    
    await User.findByIdAndDelete(userId);
    
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// POST route for admin login
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    
    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if the account is burned (deactivated)
    if (user.burned) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    
    // Generate tokens for admin
    const accessToken = jwt.sign(
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
    
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN_SECRET || 'pseven-refresh!123',
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ 
      token: accessToken,
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

// Route to check if an email belongs to an admin user
router.post('/check-role', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  
  try {
    // Find the user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(200).json({ role: 'unknown' });
    }
    
    // Return the user's role
    res.status(200).json({ role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;