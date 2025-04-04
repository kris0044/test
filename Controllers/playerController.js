const Player = require("../models/Player");
const Match = require("../models/Match");
const Score = require("../models/Score");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");

// Get all players
exports.getAllPlayers = async (req, res) => {
  try {
    const players = await Player.find().populate("team");
    res.json(players);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Create a new player
exports.createPlayer = async (req, res) => {
  try {
    const { name, team, role } = req.body;
    // console.log("Request Body:", req.body); // Debugging step

    const newPlayer = new Player({
      name,
      team: team || null, // Ensure null is set explicitly
      role,
    });

    await newPlayer.save();
    res.status(201).json({ message: "Player added successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(400).json({ message: "Error creating player" });
  }
};


// Update an existing player
// Update an existing player
exports.updatePlayer = async (req, res) => {
  try {
    const { name, team, role } = req.body;

    const updatedPlayer = await Player.findByIdAndUpdate(
      req.params.id,
      { 
        name, 
        team: team || null, // Ensure null is set explicitly if team is not provided
        role 
      },
      { new: true } // Return the updated player
    );

    if (!updatedPlayer) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json({ message: "Player updated successfully", updatedPlayer });
  } catch (error) {
    res.status(400).json({ message: "Error updating player" });
  }
};

// Delete a player
exports.deletePlayer = async (req, res) => {
  try {
    await Player.findByIdAndDelete(req.params.id);
    res.json({ message: "Player deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: "Error deleting player" });
  }
};
exports.getAvailablePlayers = async (req, res) => {
  try {
    const availablePlayers = await Player.find({ team: null });
    res.json(availablePlayers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching available players" });
  }
};
exports.getPlayers = async (req, res) => {
  try {
    const { teamIds } = req.query;
    const query = teamIds ? { team: { $in: teamIds.split(",") } } : {};
    const players = await Player.find(query);
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.deleteMultiplePlayers = async (req, res) => {
  try {
    const { playerIds } = req.body; // Expecting an array of player IDs
    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0) {
      return res.status(400).json({ message: 'No player IDs provided' });
    }

    const result = await Player.deleteMany({ _id: { $in: playerIds } });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No players found to delete' });
    }

    res.status(200).json({ message: `${result.deletedCount} players deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting players', error: error.message });
  }
};
exports.getPlayer = async (req, res) => {
  try {
    const { search } = req.query;
    if (search) {
      const players = await Player.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { team: { $regex: search, $options: 'i' } }
        ]
      }).limit(10);
      res.json(players);
    } else {
      const players = await Player.find();
      res.json(players);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
exports.getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);
    if (!player) return res.status(404).json({ message: 'Player not found' });
    res.json(player);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
exports.getPlayerMatches = async (req, res) => {
  try {
    const { playerId } = req.params;
    const { limit = 10 } = req.query;

    const matches = await Match.find({
      $or: [
        { "currentBatsmen": playerId },
        { "currentBowler": playerId },
        { "matchStats.innings1.batting": { $exists: true, $ne: {} } },
        { "matchStats.innings2.batting": { $exists: true, $ne: {} } },
      ],
    })
      .populate("teams")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get player statistics (new endpoint)
exports.getPlayerStats = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Fetch all matches involving the player
    const matches = await Match.find({
      $or: [
        { "currentBatsmen": playerId },
        { "currentBowler": playerId },
        { "matchStats.innings1.batting": { $exists: true } },
        { "matchStats.innings2.batting": { $exists: true } },
      ],
    });

    // Aggregate batting and bowling stats from matchStats
    let battingStats = { runs: 0, balls: 0, innings: 0, highest: 0, fifties: 0, hundreds: 0 };
    let bowlingStats = { runs: 0, balls: 0, wickets: 0, best: "0/0", fiveWickets: 0 };

    matches.forEach((match) => {
      ["innings1", "innings2"].forEach((inning) => {
        const batting = match.matchStats.get(inning)?.batting || {};
        const bowling = match.matchStats.get(inning)?.bowling || {};
        const extras = match.matchStats.get(inning)?.extras || {};

        // Batting stats
        if (batting[playerId]) {
          const stats = batting[playerId];
          battingStats.runs += stats.runs || 0;
          battingStats.balls += stats.balls || 0;
          battingStats.innings += 1;
          battingStats.highest = Math.max(battingStats.highest, stats.runs || 0);
          if (stats.runs >= 50 && stats.runs < 100) battingStats.fifties += 1;
          if (stats.runs >= 100) battingStats.hundreds += 1;
        }

        // Bowling stats
        if (bowling[playerId]) {
          const stats = bowling[playerId];
          bowlingStats.runs += stats.runs || 0;
          bowlingStats.balls += stats.balls || 0;
          bowlingStats.wickets += stats.wickets || 0;
          const bestWickets = stats.wickets || 0;
          const bestRuns = stats.runs || 0;
          const currentBest = bowlingStats.best.split("/").map(Number);
          if (bestWickets > currentBest[0] || (bestWickets === currentBest[0] && bestRuns < currentBest[1])) {
            bowlingStats.best = `${bestWickets}/${bestRuns}`;
          }
          if (stats.wickets >= 5) bowlingStats.fiveWickets += 1;
        }
      });
    });

    res.json({ batting: battingStats, bowling: bowlingStats });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPlayerFullDetails = async (req, res) => {
  try {
    const { playerId } = req.params;

    // Fetch player details
    const player = await Player.findById(playerId);
    if (!player) return res.status(404).json({ message: "Player not found" });

    // Fetch team details (team is stored as a string name)
    const team = player.team ? await Team.findOne({ name: player.team }).populate("players", "name role") : null;

    // Fetch matches where the player is involved
    const matches = await Match.find({
      $or: [
        { currentBatsmen: playerId },
        { currentBowler: playerId },
        { "matchStats.innings1.batting": { $exists: true } },
        { "matchStats.innings2.batting": { $exists: true } },
      ],
    })
      .populate("teams", "name")
      .populate("winner", "name")
      .populate("tournament", "name")
      .populate("venue", "name")
      .populate("battingTeam", "name")
      .populate("bowlingTeam", "name")
      .sort({ createdAt: -1 });

    // Fetch scores for these matches
    const matchIds = matches.map((match) => match._id);
    const scores = await Score.find({
      $or: [
        { batsman: playerId },
        { bowler: playerId },
        { outBatsman: playerId },
      ],
      match: { $in: matchIds },
    })
      .populate("batsman", "name")
      .populate("bowler", "name")
      .populate("outBatsman", "name")
      .populate("team", "name");

    // Aggregate batting and bowling stats
    let battingStats = { runs: 0, balls: 0, innings: 0, highest: 0, fifties: 0, hundreds: 0, dismissals: 0 };
    let bowlingStats = { runs: 0, balls: 0, wickets: 0, best: "0/0", fiveWickets: 0 };

    // From Match.matchStats
    matches.forEach((match) => {
      if (match.matchStats instanceof Map) {
        ["innings1", "innings2"].forEach((inning) => {
          const inningsStats = match.matchStats.get(inning) || {};
          const batting = inningsStats.batting || {};
          const bowling = inningsStats.bowling || {};

          if (batting[playerId]) {
            const stats = batting[playerId];
            battingStats.runs += stats.runs || 0;
            battingStats.balls += stats.balls || 0;
            battingStats.innings += 1;
            battingStats.highest = Math.max(battingStats.highest, stats.runs || 0);
            if (stats.runs >= 50 && stats.runs < 100) battingStats.fifties += 1;
            if (stats.runs >= 100) battingStats.hundreds += 1;
          }

          if (bowling[playerId]) {
            const stats = bowling[playerId];
            bowlingStats.runs += stats.runs || 0;
            bowlingStats.balls += stats.balls || 0;
            bowlingStats.wickets += stats.wickets || 0;
            const bestWickets = stats.wickets || 0;
            const bestRuns = stats.runs || 0;
            const currentBest = bowlingStats.best.split("/").map(Number);
            if (bestWickets > currentBest[0] || (bestWickets === currentBest[0] && bestRuns < currentBest[1])) {
              bowlingStats.best = `${bestWickets}/${bestRuns}`;
            }
            if (stats.wickets >= 5) bowlingStats.fiveWickets += 1;
          }
        });
      }
    });

    // Enhance with Score data
    scores.forEach((score) => {
      if (score.batsman?._id.toString() === playerId && score.ballType === "legal") {
        battingStats.runs += score.runs || 0;
        battingStats.balls += 1;
      }
      if (score.bowler?._id.toString() === playerId) {
        bowlingStats.runs += score.runs || 0;
        if (score.ballType === "legal") {
          bowlingStats.balls += 1;
          if (score.wicket) bowlingStats.wickets += 1;
        }
      }
      if (score.outBatsman?._id.toString() === playerId) {
        battingStats.dismissals += 1;
      }
    });

    // Response structure
    const response = {
      player: {
        id: player._id,
        name: player.name,
        team: team ? { id: team._id, name: team.name, players: team.players } : null,
        role: player.role,
        createdAt: player.createdAt,
      },
      matches: matches.map((match) => ({
        id: match._id,
        teams: match.teams,
        venue: match.venue,
        winner: match.winner,
        tournament: match.tournament,
        status: match.status,
        matchType: match.matchType, // Added matchType
        battingTeam: match.battingTeam,
        bowlingTeam: match.bowlingTeam,
        createdAt: match.createdAt,
      })),
      stats: {
        batting: battingStats,
        bowling: bowlingStats,
      },
      scores: scores.map((score) => ({
        matchId: score.match,
        team: score.team,
        batsman: score.batsman,
        bowler: score.bowler,
        runs: score.runs,
        wicket: score.wicket,
        wicketType: score.wicketType,
        outBatsman: score.outBatsman,
        ballType: score.ballType,
        over: score.over,
        innings: score.innings,
      })),
    };

    console.log("Player full details:", JSON.stringify(response, null, 2)); // Debug
    res.json(response);
  } catch (err) {
    console.error("Error in getPlayerFullDetails:", err);
    res.status(500).json({ message: "Error fetching player details", error: err.message });
  }
};