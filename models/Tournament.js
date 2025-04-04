
const mongoose = require("mongoose");

const TournamentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
  }],
  matches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match",
  }],
  semiFinals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match", // References semi-final matches
  }],
  final: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Match", // References the final match
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    default: null, // Updated when the tournament concludes
  },
  status: {
    type: String,
    enum: ["Scheduled", "Ongoing", "Completed"],
    default: "Scheduled",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Tournament", TournamentSchema);