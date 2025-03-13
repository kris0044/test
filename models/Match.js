const mongoose = require("mongoose");

const MatchSchema = new mongoose.Schema({
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  overs: Number,
  status: {
    type: String,
    enum: ["Scheduled", "Ongoing", "Completed"],
    default: "Scheduled",
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  tournament: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Tournament", 
    default: null 
  },
  matchType: {
    type: String,
    enum: ["League", "Semi-Final", "Final"],
    default: "League",
  },
  createdAt: { type: Date, default: Date.now },
  currentInnings: { type: Number, default: 1 },
  battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  captains: { type: Map, of: String, default: {} },
  currentBatsmen: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
  ],
  currentBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player", default: null },
  runsScored: { type: Map, of: Number, default: { innings1: 0, innings2: 0 } },
  wickets: { type: Map, of: Number, default: { innings1: 0, innings2: 0 } },
  oversBowled: { type: Map, of: Number, default: { innings1: 0.0, innings2: 0.0 } },
  target: { type: Number, default: null },
  newOverStarted: { type: Boolean, default: true },
  dismissedBatsmen: { type: Map, of: [String], default: { innings1: [], innings2: [] } },
  matchStats: {
    type: Map,
    of: {
      batting: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
      bowling: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },
      extras: {
        wides: { type: Map, of: Number, default: {} },
        noBalls: { type: Map, of: Number, default: {} },
      },
    },
    default: {
      innings1: { batting: {}, bowling: {}, extras: { wides: {}, noBalls: {} } },
      innings2: { batting: {}, bowling: {}, extras: { wides: {}, noBalls: {} } },
    },
  },
  // New fields for toss
  tossWinner: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
  tossChoice: { type: String, enum: ["bat", "bowl"], default: null },
  assignedScorer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, 
});

module.exports = mongoose.model("Match", MatchSchema);