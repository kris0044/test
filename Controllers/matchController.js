const mongoose = require("mongoose");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");
const User = require("../models/User");

// Create a match (Admin only)
exports.createMatch = async (req, res) => {
  const { teams, overs, tournament, assignedScorer } = req.body;

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create matches" });
  }

  if (!teams || teams.length !== 2) {
    return res.status(400).json({ error: "Please select exactly 2 teams." });
  }
  if (!overs || overs < 1) {
    return res.status(400).json({ error: "Invalid number of overs." });
  }
  if (!tournament) {
    return res.status(400).json({ error: "Tournament is required." });
  }

  try {
    const teamData = await Team.find({ _id: { $in: teams } });
    if (teamData.length !== 2) {
      return res.status(400).json({ error: "Invalid team selection." });
    }

    const tournamentData = await Tournament.findById(tournament);
    if (!tournamentData) {
      return res.status(400).json({ error: "Invalid tournament ID." });
    }

    const tournamentTeams = tournamentData.teams.map((t) => t.toString());
    if (!teams.every((teamId) => tournamentTeams.includes(teamId))) {
      return res.status(400).json({ error: "Selected teams must belong to the tournament." });
    }

    let scorerId = assignedScorer === "" || assignedScorer === undefined ? null : assignedScorer;
    if (scorerId) {
      const scorer = await User.findById(scorerId);
      if (!scorer || scorer.role !== "scorer") {
        return res.status(400).json({ error: "Assigned scorer must have the 'scorer' role" });
      }
    }

    const teamNames = teamData.map((team) => team.name);

    const newMatch = new Match({
      teams,
      overs,
      tournament,
      battingTeam: teams[0],
      bowlingTeam: teams[1],
      assignedScorer: scorerId,
    });

    await newMatch.save();
    res.status(201).json({
      message: "Match created successfully",
      match: {
        ...newMatch._doc,
        teamNames,
        tournament: tournamentData.name,
      },
    });
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({ error: "Error creating match", details: error.message });
  }
};

// Get all matches (Public)
exports.getMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate("teams", "name")
      .populate("tournament", "name")
      .populate("assignedScorer", "name email");
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ error: "Error fetching matches" });
  }
};

// Update match (Admin only)
exports.updateMatch = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update matches" });
    }

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const { tossWinner, tossChoice, battingTeam, bowlingTeam, assignedScorer } = req.body;

    if (tossWinner || tossChoice) {
      if (!tossWinner || !tossChoice) {
        return res.status(400).json({ message: "Both tossWinner and tossChoice are required if updating toss data" });
      }
      if (!match.teams.includes(tossWinner)) {
        return res.status(400).json({ message: "Toss winner must be one of the match teams" });
      }
      if (!["bat", "bowl"].includes(tossChoice)) {
        return res.status(400).json({ message: "Toss choice must be 'bat' or 'bowl'" });
      }
    }

    let scorerId = assignedScorer === "" || assignedScorer === undefined ? null : assignedScorer;
    if (scorerId) {
      const scorer = await User.findById(scorerId);
      if (!scorer || scorer.role !== "scorer") {
        return res.status(400).json({ error: "Assigned scorer must have the 'scorer' role" });
      }
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { ...req.body, assignedScorer: scorerId },
      { new: true }
    )
      .populate("teams", "name")
      .populate("tournament", "name")
      .populate("battingTeam", "name")
      .populate("bowlingTeam", "name")
      .populate("tossWinner", "name")
      .populate("winner", "name")
      .populate("assignedScorer", "name email");

    if (!updatedMatch) return res.status(404).json({ message: "Match not found" });

    res.json({ message: "Match updated successfully", match: updatedMatch });
  } catch (error) {
    console.error("Error updating match:", error);
    res.status(500).json({ error: "Error updating match", details: error.message });
  }
};

// Delete match (Admin only)
exports.deleteMatch = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete matches" });
    }

    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: "Match deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting match" });
  }
};

// Update match state (Admin or assigned scorer)
exports.updateMatchState = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isAdmin = user.role === "admin";
    const isAssignedScorer = match.assignedScorer && match.assignedScorer.toString() === user.id.toString();

    if (!isAdmin && !isAssignedScorer) {
      return res.status(403).json({ message: "You are not authorized to score this match" });
    }

    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    )
      .populate("teams", "name")
      .populate("tournament", "name");

    if (!updatedMatch) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Emit update via Socket.IO (if applicable)
    const emitMatchUpdate = req.app.get("emitMatchUpdate");
    if (emitMatchUpdate) {
      emitMatchUpdate(updatedMatch);
    } else {
      console.error("emitMatchUpdate function not found on req.app");
    }

    res.json(updatedMatch);
  } catch (error) {
    console.error("Error updating match state:", error);
    res.status(500).json({ error: "Error updating match state" });
  }
};

// Get match by ID (Public)
exports.getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate("teams", "name")
      .populate("battingTeam", "name")
      .populate("bowlingTeam", "name")
      .populate("currentBatsmen", "name")
      .populate("currentBowler", "name")
      .populate("winner", "name")
      .populate("tournament", "name")
      .populate("assignedScorer", "name email");
    if (!match) return res.status(404).json({ message: "Match not found" });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get team matches (Public)
exports.getTeamMatches = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limit = 5 } = req.query;

    const matches = await Match.find({
      $or: [{ "teams.0": teamId }, { "teams.1": teamId }],
      status: "Completed",
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("teams", "name")
      .populate("winner", "name");

    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching team matches:", error);
    res.status(500).json({ error: "Error fetching team matches" });
  }
};

// Get head-to-head matches (Public)
exports.getHeadToHeadMatches = async (req, res) => {
  try {
    const { team1Id, team2Id, limit = 10 } = req.query;

    if (!team1Id || !team2Id) {
      return res.status(400).json({ error: "Both team1Id and team2Id are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(team1Id) || !mongoose.Types.ObjectId.isValid(team2Id)) {
      return res.status(400).json({ error: "Invalid team1Id or team2Id" });
    }

    const team1 = await Team.findById(team1Id);
    const team2 = await Team.findById(team2Id);
    if (!team1 || !team2) {
      return res.status(400).json({ error: "One or both teams not found" });
    }

    const matches = await Match.find({
      teams: { $all: [team1Id, team2Id] },
      $or: [{ status: "Completed" }, { status: { $exists: false } }],
    });

    let sortedMatches = matches
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    sortedMatches = await Promise.all(
      sortedMatches.map(async (match) => {
        const validTeams = await Promise.all(
          match.teams.map(async (teamId) => {
            const team = await Team.findById(teamId);
            return team ? { _id: teamId, name: team.name } : null;
          })
        );
        match.teams = validTeams.filter((team) => team !== null);

        if (match.winner) {
          const winner = await Team.findById(match.winner);
          match.winner = winner ? { _id: match.winner, name: winner.name } : null;
        } else {
          match.winner = null;
        }

        return match;
      })
    );

    res.status(200).json(sortedMatches);
  } catch (error) {
    console.error("Error fetching head-to-head matches:", error);
    res.status(500).json({ error: "Error fetching head-to-head matches" });
  }
};