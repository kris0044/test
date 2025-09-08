const express = require('express');
const router = express.Router();
const statsController = require('../Controllers/statsController');

// Fetch all tournaments
router.get('/tournaments/list', statsController.fetchTournamentList);

// Fetch all teams
router.get('/teams/list', statsController.fetchTeamList);

// Fetch stats for a specific tournament
router.get('/tournaments/:tournamentId/stats', statsController.fetchTournamentStats);

// Fetch overall player stats across all tournaments
router.get('/stats/overall', statsController.fetchOverallStats);

module.exports = router;