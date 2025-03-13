// routes/tournament.routes.js
const express = require("express");
const router = express.Router();
const tournamentController = require("../controllers/tournamentController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", tournamentController.getAllTournaments);
router.post("/", tournamentController.createTournament);
router.put("/:id", tournamentController.updateTournament);
router.delete("/:id", tournamentController.deleteTournament);
router.post("/schedule-league", tournamentController.scheduleLeagueMatches);
router.post("/schedule-semifinals", tournamentController.scheduleSemiFinals);
router.post("/schedule-final", tournamentController.scheduleFinal);
router.post("/declare-winner", tournamentController.declareWinner);
router.get("/:tournamentId/points-table", tournamentController.getPointsTable);
router.put("/matches/:matchId", tournamentController.updateMatchResult);
router.delete("/matches/:matchId", tournamentController.deleteMatch);
router.get("/:tournamentId", tournamentController.getTournamentById);
router.get("/:tournamentId/key-players", tournamentController.getKeyPlayers);
module.exports = router;