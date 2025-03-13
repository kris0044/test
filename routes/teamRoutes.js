const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const authMiddleware = require("../middleware/authMiddleware");
// Create a new team
router.post("/", teamController.createTeam);

// Fetch all teams created by a user
router.get("/user/:userId", teamController.getUserTeams);

router.get("/", teamController.getTeams);

// Update a team
router.put("/:id", teamController.updateTeam);

// Delete a team
router.delete("/:id", teamController.deleteTeam);

module.exports = router;
