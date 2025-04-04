// routes/tournament.routes.js
const express = require("express");
const router = express.Router();
const tournamentController = require("../controllers/tournamentController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", tournamentController.getAllTournaments);
router.post("/",authMiddleware, tournamentController.createTournament);
router.put("/:id",authMiddleware, tournamentController.updateTournament);
router.delete("/:id", authMiddleware,tournamentController.deleteTournament);
router.post("/schedule-league",authMiddleware, tournamentController.scheduleLeagueMatches);
router.post("/schedule-semifinals",authMiddleware, tournamentController.scheduleSemiFinals);
router.post("/schedule-final", authMiddleware,tournamentController.scheduleFinal);
router.post("/declare-winner",authMiddleware, tournamentController.declareWinner);
router.get("/:tournamentId/points-table", tournamentController.getPointsTable);
router.put("/matches/:matchId",authMiddleware, tournamentController.updateMatchResult);
router.delete("/matches/:matchId",authMiddleware, tournamentController.deleteMatch);
router.get("/:tournamentId", tournamentController.getTournamentById);
router.get("/:tournamentId/key-players", tournamentController.getKeyPlayers);
module.exports = router;