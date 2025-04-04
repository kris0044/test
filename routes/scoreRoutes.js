const express = require("express");
const router = express.Router();
const scoreController = require("../controllers/scoreController");
const Score = require("../models/Score"); // Adjust path to your Score model
const authMiddleware = require("../middleware/authMiddleware");
router.get("/", scoreController.getScores);
router.post("/",authMiddleware, scoreController.createScore);
router.put("/:id", authMiddleware,scoreController.updateScore); // New: Update score
router.delete("/:id", authMiddleware,scoreController.deleteScore); // New: Delete score
router.delete("/all",authMiddleware, scoreController.deleteAllScores);
router.get("/match/:matchId", scoreController.getMatchScores);
module.exports = router;