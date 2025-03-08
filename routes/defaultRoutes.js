
const express = require('express');
const router = express.Router();
const { authenticate, hasPermission } = require('../middleware/auth');

// GET: API root - Show available endpoints
router.get('/', (req, res) => {
  const apiEndpoints = {
    message: "Welcome to P-Seven API",
    version: "1.0.0",
    endpoints: {
      auth: {
        routes: [
          { method: "POST", path: "/api/auth/register", description: "Register a new user" },
          { method: "POST", path: "/api/auth/login", description: "Login to get access token" }
        ]
      },
      products: {
        routes: [
          { method: "GET", path: "/api/products", description: "Get all products" },
          { method: "GET", path: "/api/products/:id", description: "Get product by ID" },
          { method: "GET", path: "/api/categories", description: "Get all product categories" }
        ]
      },
      jobs: {
        routes: [
          { method: "GET", path: "/api/jobs", description: "Get all job listings" },
          { method: "GET", path: "/api/jobs/:id", description: "Get job by ID" }
        ]
      },
      applications: {
        routes: [
          { method: "POST", path: "/api/applications/:jobId/apply", description: "Apply for a job" }
        ]
      },
      services: {
        routes: [
          { method: "GET", path: "/api/services", description: "Get all services" },
          { method: "GET", path: "/api/services/:id", description: "Get service by ID" }
        ]
      },
      helpRequests: {
        routes: [
          { method: "POST", path: "/api/help-requests/requests", description: "Request help for a service" }
        ]
      },
      dashboard: {
        routes: [
          { method: "GET", path: "/api/dashboard/overview", description: "Get dashboard statistics" }
        ]
      }
    }
  };
  
  res.status(200).json(apiEndpoints);
});

// GET: Admin endpoints documentation (requires authentication)
router.get('/admin', authenticate, hasPermission('canManageUsers'), (req, res) => {
  const adminEndpoints = {
    message: "P-Seven Admin API Endpoints",
    endpoints: {
      users: {
        routes: [
          { method: "GET", path: "/api/auth/users", description: "Get all users" },
          { method: "PUT", path: "/api/auth/users/:id", description: "Update user" },
          { method: "DELETE", path: "/api/auth/users/:id", description: "Delete user" }
        ]
      },
      products: {
        routes: [
          { method: "POST", path: "/api/products", description: "Create new product" },
          { method: "PUT", path: "/api/products/:id", description: "Update product" },
          { method: "DELETE", path: "/api/products/:id", description: "Delete product" }
        ]
      },
      jobs: {
        routes: [
          { method: "POST", path: "/api/jobs", description: "Create new job listing" },
          { method: "PUT", path: "/api/jobs/:id", description: "Update job listing" },
          { method: "DELETE", path: "/api/jobs/:id", description: "Delete job listing" }
        ]
      },
      applications: {
        routes: [
          { method: "GET", path: "/api/applications", description: "Get all applications" },
          { method: "PUT", path: "/api/applications/:id", description: "Update application status" },
          { method: "DELETE", path: "/api/applications/:id", description: "Delete application" }
        ]
      },
      services: {
        routes: [
          { method: "POST", path: "/api/services", description: "Create new service" },
          { method: "PUT", path: "/api/services/:id", description: "Update service" },
          { method: "DELETE", path: "/api/services/:id", description: "Delete service" }
        ]
      },
      helpRequests: {
        routes: [
          { method: "GET", path: "/api/help-requests/requests", description: "Get all help requests" },
          { method: "PUT", path: "/api/help-requests/requests/:id", description: "Update request status" }
        ]
      }
    }
  };

  res.status(200).json(adminEndpoints);
});

// GET: Check API status
router.get('/status', (req, res) => {
  res.status(200).json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    serverInfo: {
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    }
  });
});

module.exports = router;
