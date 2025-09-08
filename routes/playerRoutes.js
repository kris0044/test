const express = require("express");
const router = express.Router();
const {getPlayerFullDetails,getAvailablePlayers,getPlayerById,getPlayerMatches,getPlayerStats, getPlayer,getAllPlayers, createPlayer, updatePlayer, deletePlayer ,deleteMultiplePlayers} = require("../controllers/playerController");
const authMiddleware = require("../Middleware/authMiddleware"); // Protect routes


router.get("/",getAllPlayers);
router.post("/",authMiddleware, createPlayer);  // This is the correct POST route
router.put("/:id",authMiddleware, updatePlayer);
router.delete("/:id",authMiddleware, deletePlayer); // Corrected DELETE route
router.get("/available", getAvailablePlayers);
router.post('/delete-multiple',authMiddleware,deleteMultiplePlayers);
router.get("/search", getPlayer);
router.get("/:id", getPlayerById);
router.get("/player/:playerId", getPlayerMatches);
router.get("/full/:playerId", getPlayerFullDetails);
router.get("/:playerId/stats", getPlayerStats);

module.exports = router;
