const mongoose = require("mongoose");
const Team = require("./Team");

const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: String, default: null, nullable:true },
  role: { type: String, enum: ["Batsman", "Bowler", "All-Rounder", "Wicketkeeper"], required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Player", PlayerSchema);
