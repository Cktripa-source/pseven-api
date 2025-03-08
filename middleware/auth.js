
const jwt = require('jsonwebtoken');
const User = require('../models/user');

// Middleware to authenticate the user
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pseven!123');
    
    // Find user by id
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.burned) {
      return res.status(403).json({ message: 'Account has been deactivated' });
    }
    
    // Set user in request
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if user is admin
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Admin role required' });
  }
  next();
};

// Middleware to check if user has manager role or above
exports.isManager = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
    return res.status(403).json({ message: 'Access denied: Manager role or higher required' });
  }
  next();
};

// Middleware to check for specific permission
exports.hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    if (req.user.role === 'admin' || req.user.permissions[permission]) {
      next();
    } else {
      return res.status(403).json({ message: `Access denied: ${permission} permission required` });
    }
  };
};
