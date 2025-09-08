const express = require("express");
const router = express.Router();
const DashboardController = require("../Controllers/DashboardController");

// Route to get dashboard statistics
router.get("/stats", DashboardController.getDashboardStats);

module.exports = router;