const Score = require("../models/Score");
const Match = require("../models/Match"); // Import Match model for updates

// Get scores with optional filtering
exports.getScores = async (req, res) => {
  try {
    const { match, innings } = req.query; // Support filtering by innings
    const query = { match };
    if (innings) query.innings = innings;
    const scores = await Score.find(query).populate("team batsman bowler fielders");
    res.json(scores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create a new score and emit updates
exports.createScore = async (req, res) => {
  try {
    const score = new Score(req.body);
    const savedScore = await score.save();

    // Emit score update
    req.app.get("emitScoreUpdate")(savedScore);

    // Update match state and emit match update (optional)
    const match = await Match.findById(score.match).populate("teams winner");
    if (match) {
      // Example logic to update match state
      if (score.batsman && !match.currentBatsmen?.includes(score.batsman)) {
        match.currentBatsmen = match.currentBatsmen || [];
        match.currentBatsmen.push(score.batsman);
      }
      if (score.bowler) match.currentBowler = score.bowler;
      // Add more logic as needed (e.g., runs, wickets)
      await match.save();
      req.app.get("emitMatchUpdate")(match);
    }

    res.status(201).json(savedScore);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Update an existing score and emit updates
exports.updateScore = async (req, res) => {
  try {
    const score = await Score.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!score) return res.status(404).json({ message: "Score not found" });

    // Emit score update
    req.app.get("emitScoreUpdate")(score);

    // Update match state and emit match update (optional)
    const match = await Match.findById(score.match).populate("teams winner");
    if (match) {
      // Recalculate match state if needed (e.g., if runs or wickets changed)
      await match.save();
      req.app.get("emitMatchUpdate")(match);
    }

    res.json(score);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete a score and emit updates
exports.deleteScore = async (req, res) => {
  try {
    const score = await Score.findByIdAndDelete(req.params.id);
    if (!score) return res.status(404).json({ message: "Score not found" });

    // Emit score update (you might want to send a "delete" event instead)
    req.app.get("emitScoreUpdate")({ _id: req.params.id, deleted: true });

    // Update match state and emit match update (optional)
    const match = await Match.findById(score.match).populate("teams winner");
    if (match) {
      // Adjust match state (e.g., remove batsman from currentBatsmen if needed)
      if (score.batsman) {
        match.currentBatsmen = match.currentBatsmen?.filter(id => id !== score.batsman) || [];
      }
      await match.save();
      req.app.get("emitMatchUpdate")(match);
    }

    res.json({ message: "Score deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete all scores for a match and emit updates
exports.deleteAllScores = async (req, res) => {
  try {
    const { match } = req.query;
    if (!match) return res.status(400).json({ message: "Match ID required" });

    const deletedScores = await Score.deleteMany({ match });

    // Emit an event for all deleted scores (or a custom event)
    req.app.get("emitScoreUpdate")({ match, deletedAll: true, count: deletedScores.deletedCount });

    // Update match state and emit match update (optional)
    const matchDoc = await Match.findById(match).populate("teams winner");
    if (matchDoc) {
      // Reset match state as needed (e.g., clear currentBatsmen, currentBowler)
      matchDoc.currentBatsmen = [];
      matchDoc.currentBowler = null;
      await matchDoc.save();
      req.app.get("emitMatchUpdate")(matchDoc);
    }

    res.json({ message: "All scores deleted for the match" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all scores for a specific match
exports.getMatchScores = async (req, res) => {
  try {
    const { matchId } = req.params;
    const scores = await Score.find({ match: matchId }).populate("team batsman bowler fielders");
    res.json(scores);
  } catch (error) {
    res.status(500).json({ message: "Error fetching scores", error });
  }
};