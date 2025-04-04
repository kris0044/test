const mongoose = require("mongoose");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const Umpire = require("../models/Umpire");
const Venue = require("../models/Venue");
const { ObjectId } = require('mongoose').Types;

// Create a match (Admin only)
exports.createMatch = async (req, res) => {
  const { teams, overs, tournament, assignedScorer, umpires, venue, referee, matchType, matchDate, matchTime } = req.body;

  console.log("Request body:", req.body);

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Only admins can create matches" });
  }

  if (!teams || teams.length !== 2) {
    return res.status(400).json({ error: "Please select exactly 2 teams." });
  }
  if (!overs || overs < 1) {
    return res.status(400).json({ error: "Invalid number of overs." });
  }
  if (!venue) {
    return res.status(400).json({ error: "Venue is required." });
  }
  if (!matchType) {
    return res.status(400).json({ error: "Match type is required." });
  }
  if (!matchDate) {
    return res.status(400).json({ error: "Match date is required." });
  }
  if (!matchTime) {
    return res.status(400).json({ error: "Match time is required." });
  }

  try {
    const teamData = await Team.find({ _id: { $in: teams } });
    if (teamData.length !== 2) {
      return res.status(400).json({ error: "Invalid team selection." });
    }

    let tournamentData = null;
    if (tournament) {
      tournamentData = await Tournament.findById(tournament);
      if (!tournamentData) {
        return res.status(400).json({ error: "Invalid tournament ID." });
      }

      const tournamentTeams = tournamentData.teams.map((t) => t.toString());
      if (!teams.every((teamId) => tournamentTeams.includes(teamId))) {
        return res.status(400).json({ error: "Selected teams must belong to the tournament." });
      }
    }

    let scorerId = assignedScorer === "" || assignedScorer === undefined ? null : assignedScorer;
    if (scorerId) {
      const scorer = await User.findById(scorerId);
      if (!scorer || scorer.role !== "scorer") {
        return res.status(400).json({ error: "Assigned scorer must have the 'scorer' role" });
      }
    }

    let umpireIds = umpires || [];
    if (umpireIds.length > 0) {
      const umpireData = await Umpire.find({ _id: { $in: umpireIds } });
      if (umpireData.length !== umpireIds.length) {
        return res.status(400).json({ error: "Invalid umpire selection" });
      }
    }

    const venueData = await Venue.findById(venue);
    if (!venueData) {
      return res.status(400).json({ error: "Invalid venue ID" });
    }

    const teamNames = teamData.map((team) => team.name);

    const newMatch = new Match({
      teams,
      overs,
      tournament: tournament || null, // Allow null if no tournament is provided
      battingTeam: teams[0],
      bowlingTeam: teams[1],
      assignedScorer: scorerId,
      umpires: umpireIds,
      venue,
      referee,
      matchType,
      matchDate,
      matchTime,
    });

    console.log("New match before save:", newMatch);
    await newMatch.save();
    console.log("Match saved:", newMatch);

    res.status(201).json({
      message: "Match created successfully",
      match: {
        ...newMatch._doc,
        teamNames,
        tournament: tournamentData ? tournamentData.name : "No Tournament",
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
      .populate("umpires", "name email")
      .populate("venue", "name")
      .populate("assignedScorer", "name email");
    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ error: "Error fetching matches" });
  }
};

// Update match (Admin only)
exports.updateMatch = async (req, res) => {
  try {
    if (!req.user || (req.user.role !== "admin" && req.user.role !== "scorer")) {
      return res.status(403).json({ error: "Only admins or scorers can update matches" });
    }

    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: "Match not found" });

    const { tossWinner, tossChoice, battingTeam, bowlingTeam, assignedScorer, umpires, venue, referee, matchDate, matchTime,playing11 } = req.body;

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
      if (playing11) {
        match.playing11 = playing11;
      }
    }

    let scorerId = assignedScorer === "" || assignedScorer === undefined ? match.assignedScorer : assignedScorer;
    if (scorerId) {
      const scorer = await User.findById(scorerId);
      if (!scorer || scorer.role !== "scorer") {
        return res.status(400).json({ error: "Assigned scorer must have the 'scorer' role" });
      }
      match.assignedScorer = scorerId;
    } else if (assignedScorer === null) {
      match.assignedScorer = null;
    }

    let umpireIds = umpires === undefined ? match.umpires : umpires;
    if (umpireIds && umpireIds.length > 0) {
      const umpireData = await Umpire.find({ _id: { $in: umpireIds } });
      if (umpireData.length !== umpireIds.length) {
        return res.status(400).json({ error: "Invalid umpire selection" });
      }
      match.umpires = umpireIds;
    } else if (umpires === null) {
      match.umpires = [];
    }

    let venueId = venue === undefined ? match.venue : venue;
    if (venueId) {
      const venueData = await Venue.findById(venueId);
      if (!venueData) {
        return res.status(400).json({ error: "Invalid venue ID" });
      }
      match.venue = venueId;
    }

    // Handle matchDate and matchTime updates only if provided
    if (matchDate !== undefined) match.matchDate = matchDate;
    if (matchTime !== undefined) match.matchTime = matchTime;

    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { ...req.body, assignedScorer: scorerId, umpires: umpireIds, venue: venueId, referee, matchDate, matchTime ,playing11},
      { new: true }
    )
      .populate("teams", "name")
      .populate("tournament", "name")
      .populate("battingTeam", "name")
      .populate("bowlingTeam", "name")
      .populate("tossWinner", "name")
      .populate("winner", "name")
      .populate("assignedScorer", "name email")
      .populate("umpires", "name email")
      .populate("venue", "name");

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
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid match ID" });
    }

    const match = await Match.findById(req.params.id);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isAdmin = user.role === "admin";
    const isAssignedScorer = match.assignedScorer && user.id && 
      match.assignedScorer.toString() === user.id.toString();

    if (!isAdmin && !isAssignedScorer) {
      return res.status(403).json({ message: "You are not authorized to score this match" });
    }

    console.log("Updating match state with:", req.body);
    const updatedMatch = await Match.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!updatedMatch) {
      return res.status(404).json({ message: "Match not found" });
    }

    await updatedMatch.populate([
      { path: "teams", select: "name" },
      { path: "tournament", select: "name" }
    ]);

    const emitMatchUpdate = req.app.get("emitMatchUpdate");
    if (emitMatchUpdate) {
      emitMatchUpdate(updatedMatch);
    } else {
      console.warn("emitMatchUpdate function not found on req.app");
    }

    res.json(updatedMatch);
  } catch (error) {
    console.error("Error updating match state:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
      params: req.params
    });
    res.status(500).json({ error: "Error updating match state", details: error.message });
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
      .populate("assignedScorer", "name email")
      .populate("umpires", "name")
      .populate("venue", "name")
      .populate({ path: "playing11", populate: { path: "value", model: "Player", select: "name" } }); // Populate playing11
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
      .populate("winner", "name")
      .populate("umpires", "name email")
      .populate("venue", "name"); 

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