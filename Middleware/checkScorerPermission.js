// middleware/checkScorerPermission.js
const Match = require("../models/Match");

const checkScorerPermission = async (req, res, next) => {
  const matchId = req.params.id;
  const userId = req.user._id; // Assuming user is attached to req from authentication middleware

  const match = await Match.findById(matchId);
  if (!match) {
    return res.status(404).json({ error: "Match not found" });
  }

  if (req.user.role !== "scorer" || match.assignedScorer.toString() !== userId.toString()) {
    return res.status(403).json({ error: "You are not authorized to score this match" });
  }

  next();
};

module.exports = { checkScorerPermission };