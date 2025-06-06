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

// Initialize Express app
const app = express();
app.get('/',(req,res)=>{
  res.send("hello pazzo")
});
// Environment check
const isProduction = process.env.NODE_ENV === 'production';

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://www.psevenrwanda.com',
      'https://psevenrwanda.com',
      'https://pseven-web.vercel.app',
      'http://localhost:3000'  // Add this line
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Disposition'],
  maxAge: 3600
};

app.use(cors(corsOptions)); // Apply CORS middleware

// Middleware for CSP - Modified to include your production domain
app.use((req, res, next) => {
  const frameAncestors = isProduction 
    ? `'self' ${process.env.FRONTEND_URL || '*'}` 
    : "'self' http://localhost:3000";
  res.setHeader("Content-Security-Policy", `frame-ancestors ${frameAncestors}`);
  next();
});

// Middleware to set security headers
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Middleware to parse requests
app.use(express.json({ limit: '10kb' }));
app.use(morganMiddleware);

// Handle file directories conditionally based on environment
if (!isProduction) {
  // Only create local directories in development
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const cvsDir = path.join(__dirname, 'uploads', 'cvs');
  if (!fs.existsSync(cvsDir)) {
    fs.mkdirSync(cvsDir, { recursive: true });
  }
  
  // Serve static files from 'uploads' in development
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// Rate limiters
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
app.use('/api', apiLimiter);

const connectDB = async () => {
  let keepAliveInterval;

  const resetKeepAliveInterval = () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  };

  const setupKeepAlive = () => {
    resetKeepAliveInterval();
    keepAliveInterval = setInterval(async () => {
      try {
        await mongoose.connection.db.admin().ping();
        logger.info('MongoDB cluster keep-alive successful');
      } catch (error) {
        logger.warn('MongoDB keep-alive ping failed', { error: error.message });
        // Attempt to reconnect if keep-alive fails
        await connectDB();
      }
    }, 24 * 60 * 60 * 1000); // Daily keep-alive check
  };

  try {
    const mongoURI = process.env.MONGODB_CONNECT_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    };

    // Remove any existing listeners to prevent duplicate handlers
    mongoose.connection.removeAllListeners();

    // Connection state logging
    mongoose.connection.on('connecting', () => {
      logger.info('Attempting to connect to MongoDB...');
    });

    mongoose.connection.on('connected', () => {
      logger.info('Successfully connected to MongoDB');
      setupKeepAlive();
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection lost. Attempting to reconnect...');
      resetKeepAliveInterval();
      setTimeout(connectDB, 5000);
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', {
        message: err.message,
        name: err.name,
        code: err.code
      });
      
      // Attempt to close existing connection
      mongoose.disconnect().catch(() => {});
      
      // Retry connection
      setTimeout(connectDB, 5000);
    });

    // Attempt initial connection
    await mongoose.connect(mongoURI, connectionOptions);

  } catch (err) {
    logger.error('Fatal MongoDB connection error', {
      message: err.message,
      stack: err.stack
    });
    
    // Exponential backoff reconnection strategy
    const reconnectWithBackoff = (retries = 0) => {
      const delay = Math.min(30000, Math.pow(2, retries) * 1000);
      
      setTimeout(async () => {
        logger.info(`Attempting to reconnect (Retry ${retries + 1})`);
        
        try {
          await connectDB();
        } catch (reconnectError) {
          logger.warn('Reconnection attempt failed', {
            retries: retries + 1,
            error: reconnectError.message
          });
          
          // Continue with exponential backoff
          reconnectWithBackoff(retries + 1);
        }
      }, delay);
    };

    // Start reconnection strategy
    reconnectWithBackoff();
  }
};

// Graceful shutdown handler
const gracefulShutdown = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    logger.error('Error during MongoDB disconnection', err);
    process.exit(1);
  }
};

// Add process event listeners for graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Initial connection
connectDB();
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
app.use('/api', serviceRoutes);
app.use('/api', defaultRoutes);
app.use('/api/uploads', uploadRoutes);

// Health check route - improved for deployment monitoring
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    db: dbStatus[dbState] || 'unknown',
    uptime: process.uptime()
  });
});

// Conditional file serving based on environment
if (!isProduction) {
  // Serve CV files explicitly only in development
  app.get('/uploads/cvs/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', 'cvs', req.params.filename);
    res.contentType('application/pdf');
    res.sendFile(filePath, (err) => {
      if (err) {
        logger.error(`Error serving CV file: ${err.message}`);
        res.status(err.status || 404).end();
      }
    });
  });
}

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

// Global error handler - improved with better error details
app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);

  logger.error(`[ErrorID: ${errorId}] ${err.message}`);
  logger.error(err.stack);

  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    errorId: errorId,
    status: statusCode,
    stack: !isProduction ? err.stack : undefined
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process here, just log the error
});

// Start server
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => { // Listen on all network interfaces
  logger.info(`Server is running on port ${port}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app; // Export for testing purposes
