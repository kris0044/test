const mongoose = require("mongoose");

const ScoreSchema = new mongoose.Schema({
  match: { type: mongoose.Schema.Types.ObjectId, ref: "Match", required: true },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  batsman: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
  runs: { type: Number, default: 0 },
  ball: { type: String, required: true },
  wicket: { type: Boolean, default: false },
  wicketType: { type: String, enum: ["bowled", "caught", "stumped", "run out"] },
  fielders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  runsOnWicket: { type: Number, default: 0 }, // New field
  outBatsman: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // New field
  over: { type: Number, required: true },
  innings: { type: Number, required: true },
  ballType: { type: String, enum: ["legal", "wide", "noBall", "bye", "legBye"], default: "legal" },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Score", ScoreSchema);