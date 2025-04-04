const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Score = require('../models/Score');
const mongoose = require('mongoose');

// Fetch list of tournaments
exports.fetchTournamentList = async (req, res) => {
  try {
    const tournaments = await Tournament.find().select('_id name').lean();
    res.status(200).json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Server error fetching tournaments', error: error.message });
  }
};

// Fetch list of teams
exports.fetchTeamList = async (req, res) => {
  try {
    const teams = await Team.find().select('_id name').lean();
    res.status(200).json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error fetching teams', error: error.message });
  }
};

// Fetch player statistics for a specific tournament
exports.fetchTournamentStats = async (req, res) => {
  const { tournamentId } = req.params;
  const { team, category = 'Runs', page = 1, limit = 10 } = req.query;

  try {
    // Validate tournamentId
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({ message: 'Invalid tournament ID' });
    }

    const skip = (page - 1) * limit;
    const matchStage = { 'match.tournament': new mongoose.Types.ObjectId(tournamentId) };
    if (team) {
      if (!mongoose.Types.ObjectId.isValid(team)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      matchStage.team = new mongoose.Types.ObjectId(team);
    }

    let sortField;
    switch (category) {
      case 'Runs': sortField = 'runs'; break;
      case 'Wickets': sortField = 'wickets'; break;
      case 'Sixes': sortField = 'sixes'; break;
      case 'Fours': sortField = 'fours'; break;
      case 'Strike Rate': sortField = 'strikeRate'; break;
      case 'Economy': sortField = 'economy'; break;
      default: sortField = 'runs';
    }

    const pipeline = [
      { $lookup: { from: 'matches', localField: 'match', foreignField: '_id', as: 'match' } },
      { $unwind: '$match' },
      { $match: matchStage },
      {
        $group: {
          _id: '$batsman',
          name: { $first: '$batsman' },
          team: { $first: '$team' },
          runs: { $sum: { $ifNull: ['$runs', 0] } },
          ballsFaced: { $sum: { $cond: [{ $eq: ['$ballType', 'legal'] }, 1, 0] } },
          wickets: { $sum: { $cond: [{ $and: [{ $eq: ['$wicket', true] }, { $ne: ['$wicketType', 'run out'] }] }, 1, 0] } },
          ballsBowled: { $sum: { $cond: [{ $ne: ['$bowler', null] }, 1, 0] } },
          runsConceded: { $sum: { $cond: [{ $ne: ['$bowler', null] }, { $ifNull: ['$runs', 0] }, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$runs', 6] }, 1, 0] } },
          fours: { $sum: { $cond: [{ $eq: ['$runs', 4] }, 1, 0] } },
          innings: { $addToSet: '$innings' },
        },
      },
      {
        $project: {
          name: 1,
          team: 1,
          runs: 1,
          wickets: 1,
          sixes: 1,
          fours: 1,
          ballsFaced: 1,
          ballsBowled: 1,
          runsConceded: 1,
          matches: { $size: '$innings' },
          strikeRate: { $cond: [{ $gt: ['$ballsFaced', 0] }, { $multiply: [{ $divide: ['$runs', '$ballsFaced'] }, 100] }, 0] },
          economy: { $cond: [{ $gt: ['$ballsBowled', 0] }, { $divide: ['$runsConceded', { $divide: ['$ballsBowled', 6] }] }, 0] },
        },
      },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'playerInfo' } },
      { $unwind: { path: '$playerInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'teams', localField: 'team', foreignField: '_id', as: 'teamInfo' } },
      { $unwind: { path: '$teamInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$playerInfo.name', 'Unknown'] },
          team: { $ifNull: ['$teamInfo.name', 'Unknown'] },
          runs: 1,
          wickets: 1,
          sixes: 1,
          fours: 1,
          ballsFaced: 1,
          ballsBowled: 1,
          runsConceded: 1,
          matches: 1,
          strikeRate: 1,
          economy: 1,
        },
      },
      { $sort: { [sortField]: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const players = await Score.aggregate(pipeline).exec();
    const total = await Score.aggregate([
      { $lookup: { from: 'matches', localField: 'match', foreignField: '_id', as: 'match' } },
      { $unwind: '$match' },
      { $match: matchStage },
      { $group: { _id: '$batsman' } },
      { $count: 'total' },
    ]);

    const totalCount = total.length > 0 ? total[0].total : 0;

    res.status(200).json({
      data: players,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching tournament stats:', error);
    res.status(500).json({ message: 'Server error fetching tournament stats', error: error.message });
  }
};

// Fetch player statistics across all tournaments
exports.fetchOverallStats = async (req, res) => {
  const { team, category = 'Runs', page = 1, limit = 10 } = req.query;

  try {
    const skip = (page - 1) * limit;
    const matchStage = {};
    if (team) {
      if (!mongoose.Types.ObjectId.isValid(team)) {
        return res.status(400).json({ message: 'Invalid team ID' });
      }
      matchStage.team = new mongoose.Types.ObjectId(team);
    }

    let sortField;
    switch (category) {
      case 'Runs': sortField = 'runs'; break;
      case 'Wickets': sortField = 'wickets'; break;
      case 'Sixes': sortField = 'sixes'; break;
      case 'Fours': sortField = 'fours'; break;
      case 'Strike Rate': sortField = 'strikeRate'; break;
      case 'Economy': sortField = 'economy'; break;
      default: sortField = 'runs';
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: '$batsman',
          name: { $first: '$batsman' },
          team: { $first: '$team' },
          runs: { $sum: { $ifNull: ['$runs', 0] } },
          ballsFaced: { $sum: { $cond: [{ $eq: ['$ballType', 'legal'] }, 1, 0] } },
          wickets: { $sum: { $cond: [{ $and: [{ $eq: ['$wicket', true] }, { $ne: ['$wicketType', 'run out'] }] }, 1, 0] } },
          ballsBowled: { $sum: { $cond: [{ $ne: ['$bowler', null] }, 1, 0] } },
          runsConceded: { $sum: { $cond: [{ $ne: ['$bowler', null] }, { $ifNull: ['$runs', 0] }, 0] } },
          sixes: { $sum: { $cond: [{ $eq: ['$runs', 6] }, 1, 0] } },
          fours: { $sum: { $cond: [{ $eq: ['$runs', 4] }, 1, 0] } },
          innings: { $addToSet: '$innings' },
        },
      },
      {
        $project: {
          name: 1,
          team: 1,
          runs: 1,
          wickets: 1,
          sixes: 1,
          fours: 1,
          ballsFaced: 1,
          ballsBowled: 1,
          runsConceded: 1,
          matches: { $size: '$innings' },
          strikeRate: { $cond: [{ $gt: ['$ballsFaced', 0] }, { $multiply: [{ $divide: ['$runs', '$ballsFaced'] }, 100] }, 0] },
          economy: { $cond: [{ $gt: ['$ballsBowled', 0] }, { $divide: ['$runsConceded', { $divide: ['$ballsBowled', 6] }] }, 0] },
        },
      },
      { $lookup: { from: 'players', localField: '_id', foreignField: '_id', as: 'playerInfo' } },
      { $unwind: { path: '$playerInfo', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'teams', localField: 'team', foreignField: '_id', as: 'teamInfo' } },
      { $unwind: { path: '$teamInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: { $ifNull: ['$playerInfo.name', 'Unknown'] },
          team: { $ifNull: ['$teamInfo.name', 'Unknown'] },
          runs: 1,
          wickets: 1,
          sixes: 1,
          fours: 1,
          ballsFaced: 1,
          ballsBowled: 1,
          runsConceded: 1,
          matches: 1,
          strikeRate: 1,
          economy: 1,
        },
      },
      { $sort: { [sortField]: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const players = await Score.aggregate(pipeline).exec();
    const total = await Score.aggregate([{ $match: matchStage }, { $group: { _id: '$batsman' } }, { $count: 'total' }]);
    const totalCount = total.length > 0 ? total[0].total : 0;

    res.status(200).json({
      data: players,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    res.status(500).json({ message: 'Server error fetching overall stats', error: error.message });
  }
};  