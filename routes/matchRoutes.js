const express = require("express");
const {
  createMatch,
  getMatches,
  updateMatch,
  deleteMatch,
  getMatchById,
  updateMatchState,
  getTeamMatches,
  getHeadToHeadMatches,
} = require("../controllers/matchController");
const authMiddleware = require("../middleware/authMiddleware"); // Corrected typo in import
const router = express.Router();

// Admin-only routes
router.post("/", authMiddleware, createMatch);          // Create match (admin only)
router.put("/:id", authMiddleware, updateMatch);        // Update match (admin only)
router.delete("/:id", authMiddleware, deleteMatch);     // Delete match (admin only)

// Protected routes (admin or assigned scorer)
router.put("/:id/state", authMiddleware, updateMatchState); // Update match state (admin or scorer)

// Public or less restricted routes
router.get("/", getMatches);                            // Get all matches
router.get("/team/:teamId", getTeamMatches);            // Get team matches
router.get("/head-to-head", getHeadToHeadMatches);      // Get head-to-head matches
router.get("/:id", getMatchById);                       // Get match by ID

module.exports = router;