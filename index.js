const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config(); // Ensure dotenv is being loaded


// Import routes
const productRoutes = require('./routes/productRoutes');
const authRoutes = require('./routes/auth');
const loginRoutes = require('./routes/login');
const jobRoutes = require('./routes/jobRoutes'); // Import job routes
const applicationRoutes = require('./routes/applicationRoutes'); // Import application routes

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse incoming JSON requests

// MongoDB connection
const mongoURI = process.env.MONGODB_CONNECT_URI; // MongoDB URI

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000, // Timeout for selecting the server
  socketTimeoutMS: 45000, // Timeout for socket operations (queries)
})
  .then(() => console.log('Connected to MongoDB successfully!'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit process if DB connection fails
  });


// Use routes
app.use('/api', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/login', loginRoutes); // Use authentication routes here
app.use('/api/jobs', jobRoutes); // Use job routes
app.use('/api/applications', applicationRoutes); // Use application routes

// Serve static images from the 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
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
