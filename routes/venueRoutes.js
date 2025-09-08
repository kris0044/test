const express = require("express");
const router = express.Router();
const venueController = require("../Controllers/venueController");
const authMiddleware = require("../Middleware/authMiddleware"); // Protect routes

router.get("/", venueController.getVenues);
router.post("/", authMiddleware,venueController.addVenue);
router.put("/:id",authMiddleware, venueController.updateVenue);
router.delete("/:id", authMiddleware,venueController.deleteVenue);

module.exports = router;