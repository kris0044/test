
const Team = require("../models/Team");
const Player = require("../models/Player");



// Create Team
exports.createTeam = async (req, res) => {
  try {
    const { name, players, id } = req.body; // userId from frontend

    const newTeam = new Team({
      name,
      players,
      createdBy: id,
    });

    await newTeam.save();

    // ✅ Store team NAME in Player schema
    await Player.updateMany(
      { _id: { $in: players } },
      { $set: { team: newTeam.name } } // ⬅️ Store name instead of ID
    );

    res.json({ message: "Team created successfully", team: newTeam });
  } catch (error) {
    res.status(500).json({ message: "Error creating team" });
  }
};

exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate("players"); // Populate players if needed
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: "Error fetching teams" });
  }
};
// Get Teams for a User
exports.getUserTeams = async (req, res) => {
  try {
    const teams = await Team.find().populate("players");
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: "Error fetching teams" });
  }
};


// Update Team
exports.updateTeam = async (req, res) => {
  try {
    const { name, players } = req.body;
    const { id } = req.params;

    const team = await Team.findOne({ _id: id });
    if (!team) {
      return res.status(403).json({ message: "Unauthorized to update this team" });
    }

    // ✅ Remove old players' team reference
    await Player.updateMany(
      { _id: { $in: team.players } },
      { $set: { team: null } }
    );

    // ✅ Store team NAME instead of ID for new players
    await Player.updateMany(
      { _id: { $in: players } },
      { $set: { team: name } } // ⬅️ Store team name
    );

    // ✅ Update team data
    team.name = name;
    team.players = players;
    await team.save();

    res.json({ message: "Team updated successfully", team });
  } catch (error) {
    res.status(500).json({ message: "Error updating team" });
  }
};


// Delete Team
exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;

    const team = await Team.findOne({ _id: id });
    if (!team) {
      return res.status(403).json({ message: "Unauthorized to delete this team" });
    }

    // ✅ Remove team NAME reference from players
    await Player.updateMany(
      { team: team.name }, // ⬅️ Match by team name instead of ID
      { $set: { team: null } }
    );

    await Team.findByIdAndDelete(id);
    res.json({ message: "Team deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting team" });
  }
};

