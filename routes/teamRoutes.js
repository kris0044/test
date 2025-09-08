const express = require("express");
const router = express.Router();
const teamController = require("../Controllers/teamController");
const authMiddleware = require("../Middleware/authMiddleware");
// Create a new team
router.post("/",authMiddleware, teamController.createTeam);

// Fetch all teams created by a user
router.get("/user/:userId", teamController.getUserTeams);

router.get("/", teamController.getTeams);

// Update a team
router.put("/:id",authMiddleware, teamController.updateTeam);

// Delete a team
router.delete("/:id",authMiddleware, teamController.deleteTeam);

module.exports = router;
