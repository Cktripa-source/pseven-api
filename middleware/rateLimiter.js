
const rateLimit = require('express-rate-limit');

// Create different rate limiters for different routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs for login/register attempts
  message: { message: 'Too many login attempts, please try again later' }
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs for general API routes
  message: { message: 'Too many requests from this IP, please try again later' }
});

module.exports = {
  authLimiter,
  apiLimiter
};
