const express = require("express");
const router = express.Router();
const scoreController = require("../controllers/scoreController");
const Score = require("../models/Score"); // Adjust path to your Score model
const authMiddleware = require("../middleware/authMiddleware");
router.get("/", scoreController.getScores);
router.post("/", scoreController.createScore);
router.put("/:id", scoreController.updateScore); // New: Update score
router.delete("/:id", scoreController.deleteScore); // New: Delete score
router.delete("/all", scoreController.deleteAllScores);
router.get("/match/:matchId", scoreController.getMatchScores);
module.exports = router;