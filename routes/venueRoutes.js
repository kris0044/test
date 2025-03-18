const express = require("express");
const router = express.Router();
const venueController = require("../controllers/venueController");

router.get("/", venueController.getVenues);
router.post("/", venueController.addVenue);
router.put("/:id", venueController.updateVenue);
router.delete("/:id", venueController.deleteVenue);

module.exports = router;