const Player = require("../models/Player");
const Match = require("../models/Match");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const Team = require("../models/Team");
const Venue = require("../models/Venue");
const Umpire = require("../models/Umpire");

class DashboardController {
  // Fetch total counts for all entities
  static async getEntityCounts() {
    try {
      const [
        playersCount,
        matchesCount,
        tournamentsCount,
        usersCount,
        teamsCount,
        venuesCount,
        umpiresCount,
      ] = await Promise.all([
        Player.countDocuments(),
        Match.countDocuments(),
        Tournament.countDocuments(),
        User.countDocuments(),
        Team.countDocuments(),
        Venue.countDocuments(),
        Umpire.countDocuments(),
      ]);

      return {
        playersCount,
        matchesCount,
        tournamentsCount,
        usersCount,
        teamsCount,
        venuesCount,
        umpiresCount,
      };
    } catch (error) {
      throw new Error(`Error in getEntityCounts: ${error.message}`);
    }
  }

  // Fetch players grouped by team using aggregation
  static async getPlayersByTeam() {
    try {
      const result = await Player.aggregate([
        {
          $group: {
            _id: { $ifNull: ["$team", "No Team"] },
            count: { $sum: 1 },
          },
        },
        { $project: { team: "$_id", count: 1, _id: 0 } },
      ]);

      const playersByTeam = {};
      result.forEach(({ team, count }) => {
        playersByTeam[team] = count;
      });
      return playersByTeam;
    } catch (error) {
      throw new Error(`Error in getPlayersByTeam: ${error.message}`);
    }
  }

  // Fetch matches by status using aggregation
  static async getMatchesByStatus() {
    try {
      const result = await Match.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]);

      const matchesByStatus = { Ongoing: 0, Completed: 0, Scheduled: 0 };
      result.forEach(({ status, count }) => {
        if (matchesByStatus.hasOwnProperty(status)) {
          matchesByStatus[status] = count;
        }
      });
      return matchesByStatus;
    } catch (error) {
      throw new Error(`Error in getMatchesByStatus: ${error.message}`);
    }
  }

  // Fetch tournaments by status using aggregation
  static async getTournamentsByStatus() {
    try {
      const result = await Tournament.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]);

      const tournamentsByStatus = { Scheduled: 0, Ongoing: 0, Completed: 0 };
      result.forEach(({ status, count }) => {
        if (tournamentsByStatus.hasOwnProperty(status)) {
          tournamentsByStatus[status] = count;
        }
      });
      return tournamentsByStatus;
    } catch (error) {
      throw new Error(`Error in getTournamentsByStatus: ${error.message}`);
    }
  }

  // Main API handler
  static async getDashboardStats(req, res) {
    try {
      const [counts, playersByTeam, matchesByStatus, tournamentsByStatus] = await Promise.all([
        DashboardController.getEntityCounts(), // Use class name directly
        DashboardController.getPlayersByTeam(),
        DashboardController.getMatchesByStatus(),
        DashboardController.getTournamentsByStatus(),
      ]);

      const stats = {
        ...counts,
        ongoingMatches: matchesByStatus.Ongoing,
        scheduledTournaments: tournamentsByStatus.Scheduled,
        playersByTeam,
        matchesByStatus,
        tournamentsByStatus,
      };

      return res.status(200).json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }
}

module.exports = DashboardController;