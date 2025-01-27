const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  agreeToTerms: { type: Boolean, required: true },
  burned: { type: Boolean, default: false }, // Indicates if the account is restricted
});

module.exports = mongoose.model('User', UserSchema);
