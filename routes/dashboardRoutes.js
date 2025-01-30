// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const Application = require('../models/application');
const Job = require('../models/Jobs');
const Product = require('../models/Product');
const ServiceRequest = require('../models/RequestHelpService');
const User = require('../models/user');

// GET: Fetch the dashboard overview data
router.get('/overview', async (req, res) => {
  try {
    // Count total applications and applications by status
    const totalApplications = await Application.countDocuments();
    const applicationsByStatus = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const applicationsByStatusMap = {
      Pending: 0,
      Reviewed: 0,
      Accepted: 0,
      Rejected: 0,
    };
    applicationsByStatus.forEach(item => {
      applicationsByStatusMap[item._id] = item.count;
    });

    // Count total jobs and jobs by status
    const totalJobs = await Job.countDocuments();
    const jobsByStatus = await Job.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const jobsByStatusMap = { Open: 0, Closed: 0 };
    jobsByStatus.forEach(item => {
      jobsByStatusMap[item._id] = item.count;
    });

    // Count total products and low stock products
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10 } });

    // Count service requests and service requests by status
    const totalServiceRequests = await ServiceRequest.countDocuments();
    const serviceRequestsByStatus = await ServiceRequest.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const serviceRequestsByStatusMap = { Pending: 0, InProgress: 0, Completed: 0 };
    serviceRequestsByStatus.forEach(item => {
      serviceRequestsByStatusMap[item._id] = item.count;
    });

    // Count total users and burned users
    const totalUsers = await User.countDocuments();
    const burnedUsers = await User.countDocuments({ isActive: false });

    // Send the response with all the counts
    res.json({
      totalApplications,
      applicationsByStatus: applicationsByStatusMap,
      totalJobs,
      jobsByStatus: jobsByStatusMap,
      totalProducts,
      lowStockProducts,
      totalServiceRequests,
      serviceRequestsByStatus: serviceRequestsByStatusMap,
      totalUsers,
      burnedUsers,
    });
  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ message: 'Error fetching dashboard data', error: err.message });
  }
});

module.exports = router;
