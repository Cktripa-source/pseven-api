const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const fs = require('fs');
require('dotenv').config(); // Ensure this is at the very top of your entry file
const { logger, morganMiddleware } = require('./utils/logger');

// Import routes
const loginRoutes = require('./routes/login');
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const requestHelpServiceRoutes = require('./routes/requestHelpServiceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const orderRoutes = require('./routes/orderRoutes');
const contactRoutes = require('./routes/contactRoutes');
const productRoutes = require('./routes/productRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const defaultRoutes = require('./routes/defaultRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],  // Added PATCH here
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Disposition'],
  maxAge: 3600
};

// Initialize Express app
const app = express();
app.use(cors(corsOptions));

// Middleware for CSP
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://localhost:3000");
  next();
});

// Middleware to set security headers
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Middleware to parse requests
app.use(express.json({ limit: '10kb' }));
app.use(morganMiddleware);

// Check if uploads directory exists, create if not
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Check if uploads/cvs directory exists, create if not
const cvsDir = path.join(__dirname, 'uploads', 'cvs');
if (!fs.existsSync(cvsDir)) {
  fs.mkdirSync(cvsDir, { recursive: true });
}

// Rate limiters
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

// Connect to MongoDB
const connectDB = require('./utils/database');
connectDB();

// Serve static files from 'uploads'
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Define routes
app.use('/api/auth/login', authLimiter, loginRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/help-requests', requestHelpServiceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', productRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api', defaultRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is healthy' });
});

// Serve CV files explicitly
app.get('/uploads/cvs/:filename', (req, res) => {
  const filePath = path.join(uploadsDir, 'cvs', req.params.filename);
  res.contentType('application/pdf');
  res.sendFile(filePath, (err) => {
    if (err) {
      logger.error(`Error serving CV file: ${err.message}`);
      res.status(err.status || 404).end();
    }
  });
});
// 404 handler for undefined routes
app.use((req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Try accessing /api for a list of available endpoints'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Internal server error: ${err.message}`);
  logger.error(err.stack);
  
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await mongoose.disconnect();
  process.exit(0);
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

module.exports = app; // Export for testing purposes