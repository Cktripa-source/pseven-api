const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const { logger, morganMiddleware } = require('./utils/logger');
// Load and validate environment variables
try {
  require('dotenv-safe').config({
    allowEmptyValues: true,
    example: './.env.example'
  });
} catch (err) {
  console.error('Missing required environment variables:', err.message);
  // Continue running in development, exit in production
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// Import routes
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/auth');
const loginRoutes = require('./routes/login');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const requestHelpServiceRoutes = require('./routes/requestHelpServiceRoutes'); // Import request help service routes
const dashboardRoutes = require('./routes/dashboardRoutes'); // Import the dashboard routes
const orderRoutes = require('./routes/orderRoutes'); // Import order routes
const contactRoutes = require('./routes/contactRoutes'); // Import contact routes

// Initialize Express app
const app = express();

// Middleware
app.use(helmet()); // Set security HTTP headers
// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  credentials: true,
  maxAge: 3600
};
app.use(cors(corsOptions)); // Enable CORS with configured options
app.use(morganMiddleware); // Request logging
app.use(express.json({ limit: '10kb' })); // Parse incoming JSON requests with size limit

// Import rate limiter
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Apply API rate limiter to all routes except auth
app.use('/api', apiLimiter);

// Root route - redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Database connection
const connectDB = require('./utils/database');
connectDB(); // Connect to MongoDB

// Import default routes
const defaultRoutes = require('./routes/defaultRoutes');

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is healthy' });
});

// Use routes - order matters for routing
app.use('/api/auth/login', authLimiter, loginRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/help-requests', requestHelpServiceRoutes); // Use request help service routes
app.use('/api/dashboard', dashboardRoutes); // Use the new dashboard routes
app.use('/api/orders', orderRoutes); // Use order routes
app.use('/api/contact', contactRoutes); // Use contact routes
app.use('/api', productRoutes);
app.use('/api', serviceRoutes);
app.use('/api', defaultRoutes); // Default route for API documentation should be last among /api routes

// Serve static files from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve CV files with proper content type
app.get('/uploads/cvs/:filename', (req, res) => {
  const filePath = path.join(__dirname, 'uploads/cvs', req.params.filename);
  res.contentType('application/pdf');
  res.sendFile(filePath);
});

// Fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found', 
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Try accessing /api for a list of available endpoints'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
