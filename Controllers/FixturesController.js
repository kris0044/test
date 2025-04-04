const Match = require("../models/Match");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");
const Score = require("../models/Score");

class FixturesController {
  static async getTeams() {
    try {
      return await Team.find({}, "name _id").lean();
    } catch (error) {
      throw new Error(`Error in getTeams: ${error.message}`);
    }
  }

  static async getTournaments() {
    try {
      return await Tournament.find({}, "name _id").lean();
    } catch (error) {
      throw new Error(`Error in getTournaments: ${error.message}`);
    }
  }

  static async getMatches(page = 1, limit = 6, team, tournament, tab = "Series") {
    try {
      const skip = (page - 1) * limit;
      let query = {};

      // Filter by team
      if (team && team !== "ALL TEAMS") {
        const teamDocs = await Team.find({ name: team }, "_id").lean();
        const teamIds = teamDocs.map((t) => t._id);
        if (teamIds.length > 0) {
          query.teams = { $in: teamIds }; // Match any team in the teams array
        } else {
          return { matches: [], totalMatches: 0 }; // No teams found, return empty
        }
      }

      // Filter by tournament (only for Series tab)
      if (tab === "Series" && tournament && tournament !== "ALL TOURNAMENTS") {
        const tournamentDocs = await Tournament.find({ name: tournament }, "_id").lean();
        const tournamentIds = tournamentDocs.map((t) => t._id);
        if (tournamentIds.length > 0) {
          query.tournament = { $in: tournamentIds }; // Match tournament ID
        } else {
          return { matches: [], totalMatches: 0 }; // No tournaments found, return empty
        }
      }


      const matches = await Match.find(query)
        .populate("teams", "name _id")
        .populate("winner", "name _id")
        .populate("venue", "name _id")
        .populate("currentBatsmen", "name _id")
        .populate("currentBowler", "name _id")
        .populate("tournament", "name _id")
        .sort({ status: -1, createdAt: 1 }) // Changed to createdAt since startTime isn’t in schema
        .skip(skip)
        .limit(limit)
        .lean();


      const totalMatches = await Match.countDocuments(query);
      return { matches, totalMatches };
    } catch (error) {
      throw new Error(`Error in getMatches: ${error.message}`);
    }
  }

  static async getMatchScores(matches) {
    try {
      const matchIds = matches.map((match) => match._id);
      const scores = await Score.aggregate([
        { $match: { match: { $in: matchIds } } },
        {
          $group: {
            _id: "$match",
            scores: { $push: "$$ROOT" },
          },
        },
      ]);

      const scoresData = {};
      const matchStats = {};

      for (const { _id: matchId, scores: matchScores } of scores) {
        scoresData[matchId] = matchScores;

        const stats = { runsScored: {}, wickets: {}, oversBowled: {} };
        matchScores.forEach((score) => {
          const inningsKey = `innings${score.innings}`;
          stats.runsScored[inningsKey] = (stats.runsScored[inningsKey] || 0) + (score.runs || 0);
          stats.wickets[inningsKey] = score.wicket
            ? (stats.wickets[inningsKey] || 0) + 1
            : stats.wickets[inningsKey] || 0;

          const legalBalls = matchScores.filter(
            (s) => s.innings === score.innings && s.ballType === "legal"
          ).length;
          const oversWhole = Math.floor(legalBalls / 6);
          const oversFraction = legalBalls % 6;
          stats.oversBowled[inningsKey] = oversWhole + oversFraction / 10;
        });
        matchStats[matchId] = stats;
      }

      return { scoresData, matchStats };
    } catch (error) {
      throw new Error(`Error in getMatchScores: ${error.message}`);
    }
  }

  static async getFilteredFixtures(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6;
      const team = req.query.team || "ALL TEAMS";
      const tournament = req.query.tournament || "ALL TOURNAMENTS";
      const tab = req.query.tab || "Series";

      const [teams, tournaments, { matches, totalMatches }] = await Promise.all([
        this.getTeams(),
        this.getTournaments(),
        this.getMatches(page, limit, team, tournament, tab),
      ]);

      const { scoresData, matchStats } = await this.getMatchScores(matches);

      const enrichedMatches = matches.map((match) => ({
        ...match,
        runsScored: matchStats[match._id]?.runsScored || {},
        wickets: matchStats[match._id]?.wickets || {},
        oversBowled: matchStats[match._id]?.oversBowled || {},
      }));

      const groupedMatches = tab === "Series" ? groupBySeries(enrichedMatches) : groupByTeams(enrichedMatches);

      const response = {
        groupedMatches,
        teams,
        tournaments,
        scores: scoresData,
        totalMatches,
        currentPage: page,
        totalPages: Math.ceil(totalMatches / limit),
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching filtered fixtures:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }

  static async loadMoreFixtures(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 6;
      const team = req.query.team || "ALL TEAMS";
      const tournament = req.query.tournament || "ALL TOURNAMENTS";
      const tab = req.query.tab || "Series";

      const { matches, totalMatches } = await this.getMatches(page, limit, team, tournament, tab);

      const { scoresData, matchStats } = await this.getMatchScores(matches);

      const enrichedMatches = matches.map((match) => ({
        ...match,
        runsScored: matchStats[match._id]?.runsScored || {},
        wickets: matchStats[match._id]?.wickets || {},
        oversBowled: matchStats[match._id]?.oversBowled || {},
      }));

      const groupedMatches = tab === "Series" ? groupBySeries(enrichedMatches) : groupByTeams(enrichedMatches);

      const response = {
        groupedMatches,
        totalMatches,
        currentPage: page,
        totalPages: Math.ceil(totalMatches / limit),
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error("Error loading more fixtures:", error);
      return res.status(500).json({ message: error.message || "Internal server error" });
    }
  }
}

function groupBySeries(matches) {
  const grouped = {};
  matches.forEach((match) => {
    const seriesName = match.tournament?.name || "Unknown Series";
    if (!grouped[seriesName]) {
      grouped[seriesName] = [];
    }
    grouped[seriesName].push(match);
  });
  return grouped;
}

function groupByTeams(matches) {
  const grouped = {};
  matches.forEach((match) => {
    match.teams.forEach((team) => {
      const teamName = team.name || "Unknown Team";
      if (!grouped[teamName]) {
        grouped[teamName] = [];
      }
      grouped[teamName].push(match);
    });
  });
  return grouped;
}

module.exports = FixturesController;