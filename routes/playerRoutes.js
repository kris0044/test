const express = require("express");
const router = express.Router();
const {getPlayerById,getPlayerMatches,getPlayerStats, getPlayer,getAllPlayers, createPlayer, updatePlayer, deletePlayer ,deleteMultiplePlayers} = require("../controllers/playerController");
const authMiddleware = require("../middleware/authMiddleware"); // Protect routes
const { getAvailablePlayers } = require("../controllers/playerController");


router.get("/",getAllPlayers);
router.post("/", createPlayer);  // This is the correct POST route
router.put("/:id",  updatePlayer);
router.delete("/:id", deletePlayer); // Corrected DELETE route
router.get("/available", getAvailablePlayers);
router.post('/delete-multiple',deleteMultiplePlayers);
router.get("/search", getPlayer);
router.get("/:id", getPlayerById);
router.get("/player/:playerId", getPlayerMatches);
router.get("/:playerId/stats", getPlayerStats);

module.exports = router;
