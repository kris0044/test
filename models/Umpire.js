const mongoose = require("mongoose");

const umpireSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nationality: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Umpire", umpireSchema);