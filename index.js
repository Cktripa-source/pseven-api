const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Ensure dotenv is being loaded

// Import routes
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/auth');
const loginRoutes = require('./routes/login');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const requestHelpServiceRoutes = require('./routes/requestHelpServiceRoutes'); // Import request help service routes
const dashboardRoutes = require('./routes/dashboardRoutes'); // Import the dashboard routes

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests

// MongoDB connection
const mongoURI = process.env.MONGODB_CONNECT_URI;

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000, // Timeout for selecting the server
  socketTimeoutMS: 45000, // Timeout for socket operations
})
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit process if DB connection fails
  });

// Import default routes
const defaultRoutes = require('./routes/defaultRoutes');

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'Server is healthy' });
});

// Use routes - order matters for routing
app.use('/api/auth/login', loginRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/help-requests', requestHelpServiceRoutes); // Use request help service routes
app.use('/api/dashboard', dashboardRoutes); // Use the new dashboard routes
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
