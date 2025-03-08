
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['user', 'admin', 'manager', 'editor', 'viewer'], 
    default: 'user' 
  },
  permissions: {
    canManageUsers: { type: Boolean, default: false },
    canManageJobs: { type: Boolean, default: false },
    canManageProducts: { type: Boolean, default: false },
    canManageServices: { type: Boolean, default: false },
    canViewApplications: { type: Boolean, default: false },
    canEditApplications: { type: Boolean, default: false }
  },
  burned: { type: Boolean, default: false },
  agreeToTerms: { type: Boolean, default: false }
}, { timestamps: true });

// Helper method to check if user has admin privileges
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Helper method to check specific permission
userSchema.methods.hasPermission = function(permission) {
  return this.permissions[permission] === true || this.role === 'admin';
};

const User = mongoose.model('User', userSchema);
module.exports = User;
