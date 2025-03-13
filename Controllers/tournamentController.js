// controllers/tournamentController.js
const Tournament = require("../models/Tournament");
const Match = require("../models/Match");
const Team = require("../models/Team");
const Score = require("../models/Score");
const Player = require("../models/Player");

const tournamentController = {
  getAllTournaments: async (req, res) => {
    try {
      const tournaments = await Tournament.find()
        .populate("teams", "name")
        .populate({
          path: "matches",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate({
          path: "semiFinals",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate({
          path: "final",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate("winner", "name");
      res.json(tournaments);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching tournaments" });
    }
  },
  createTournament: async (req, res) => {
    const { name, startDate, endDate, teams } = req.body;
    try {
      const existingTournaments = await Tournament.find({
        teams: { $in: teams },
        endDate: { $gte: new Date() },
      });

      for (const tournament of existingTournaments) {
        const existingStart = new Date(tournament.startDate);
        const existingEnd = new Date(tournament.endDate);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        if (newStart <= existingEnd && newEnd >= existingStart) {
          return res.status(400).json({
            message: `One or more teams are already in an overlapping tournament: ${tournament.name}`,
          });
        }
      }

      const tournament = new Tournament({ name, startDate, endDate, teams });
      await tournament.save();
      res.status(201).json(tournament);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  updateTournament: async (req, res) => {
    const { name, startDate, endDate, teams } = req.body;
    try {
      const existingTournaments = await Tournament.find({
        teams: { $in: teams },
        endDate: { $gte: new Date() },
        _id: { $ne: req.params.id },
      });

      for (const tournament of existingTournaments) {
        const existingStart = new Date(tournament.startDate);
        const existingEnd = new Date(tournament.endDate);
        const newStart = new Date(startDate);
        const newEnd = new Date(endDate);

        if (newStart <= existingEnd && newEnd >= existingStart) {
          return res.status(400).json({
            message: `One or more teams are already in an overlapping tournament: ${tournament.name}`,
          });
        }
      }

      const tournament = await Tournament.findByIdAndUpdate(
        req.params.id,
        { name, startDate, endDate, teams },
        { new: true, runValidators: true }
      ).populate("teams", "name");
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  deleteTournament: async (req, res) => {
    try {
      const tournament = await Tournament.findByIdAndDelete(req.params.id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      await Match.deleteMany({ tournament: req.params.id });
      res.json({ message: "Tournament deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error deleting tournament" });
    }
  },

  scheduleLeagueMatches: async (req, res) => {
    const { tournamentId, overs } = req.body;
    try {
      const tournament = await Tournament.findById(tournamentId).populate("teams", "name");
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      if (tournament.matches.length > 0) {
        return res.status(400).json({ message: "League matches already scheduled" });
      }

      const teams = tournament.teams;
      const matches = [];

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const match = new Match({
            tournament: tournamentId,
            teams: [teams[i]._id, teams[j]._id],
            overs,
            matchType: "League",
          });
          matches.push(match);
        }
      }

      await Match.insertMany(matches);
      tournament.matches = matches.map(m => m._id);
      tournament.status = "Ongoing";
      await tournament.save();

      res.json({ message: "League matches scheduled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error scheduling league matches", error: error.message });
    }
  },

  scheduleSemiFinals: async (req, res) => {
    const { tournamentId, overs, teams } = req.body;
    try {
      const tournament = await Tournament.findById(tournamentId)
        .populate("matches")
        .populate("teams", "name");
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      if (tournament.semiFinals.length > 0) {
        return res.status(400).json({ message: "Semi-finals already scheduled" });
      }
      if (!teams || teams.length !== 4) {
        return res.status(400).json({ message: "Exactly 4 teams required for semi-finals" });
      }

      const semiFinals = [
        new Match({
          tournament: tournamentId,
          teams: [teams[0], teams[3]], // 1st vs 4th
          overs,
          matchType: "Semi-Final",
        }),
        new Match({
          tournament: tournamentId,
          teams: [teams[1], teams[2]], // 2nd vs 3rd
          overs,
          matchType: "Semi-Final",
        }),
      ];

      await Match.insertMany(semiFinals);
      tournament.semiFinals = semiFinals.map(m => m._id);
      await tournament.save();

      res.json({ message: "Semi-finals scheduled successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error scheduling semi-finals", error: error.message });
    }
  },

scheduleFinal: async (req, res) => {
  const { tournamentId, overs, teams } = req.body;
  try {
    const tournament = await Tournament.findById(tournamentId).populate("semiFinals");
    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    // Check if final exists and is valid
    if (tournament.final) {
      const existingFinal = await Match.findById(tournament.final);
      if (existingFinal) {
        return res.status(400).json({ message: "Final already scheduled" });
      } else {
        // Clear stale reference if the match doesn't exist
        tournament.final = null;
        await tournament.save();
      }
    }

    if (!teams || teams.length !== 2) {
      return res.status(400).json({ message: "Exactly 2 teams required for final" });
    }

    const finalMatch = new Match({
      tournament: tournamentId,
      teams: [teams[0], teams[1]],
      overs,
      matchType: "Final",
    });

    await finalMatch.save();
    tournament.final = finalMatch._id;
    await tournament.save();

    res.json({ message: "Final scheduled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error scheduling final", error: error.message });
  }
},

  declareWinner: async (req, res) => {
    const { tournamentId } = req.body;
    try {
      const tournament = await Tournament.findById(tournamentId).populate("final");
      if (!tournament || !tournament.final) {
        return res.status(400).json({ message: "Final not scheduled" });
      }

      const finalMatch = await Match.findById(tournament.final).populate("winner");
      if (!finalMatch.winner) {
        return res.status(400).json({ message: "Final winner not determined" });
      }

      tournament.winner = finalMatch.winner;
      tournament.status = "Completed";
      await tournament.save();

      res.json({ message: "Tournament completed successfully", winner: finalMatch.winner });
    } catch (error) {
      res.status(500).json({ message: "Error declaring winner", error: error.message });
    }
  },

  deleteMatch: async (req, res) => {
    const { matchId } = req.params;
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
  
      const tournament = await Tournament.findById(match.tournament);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
  
      // Remove match from appropriate array
      if (match.matchType === "League") {
        tournament.matches = tournament.matches.filter(m => m.toString() !== matchId);
      } else if (match.matchType === "Semi-Final") {
        tournament.semiFinals = tournament.semiFinals.filter(m => m.toString() !== matchId);
      } else if (match.matchType === "Final") {
        tournament.final = null;
      }
  
      await match.deleteOne();
      await tournament.save();
  
      res.json({ message: "Match deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting match", error: error.message });
    }
  },
  getPointsTable: async (req, res) => {
    try {
      const tournament = await Tournament.findById(req.params.tournamentId)
        .populate("teams", "name")
        .populate({
          path: "matches",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate({
          path: "semiFinals",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate({
          path: "final",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        });

      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const stats = {};
      tournament.teams.forEach(team => {
        stats[team._id.toString()] = {
          team: team.name,
          teamId: team._id,
          matches: 0,
          points: 0,
          runsScored: 0,
          oversFaced: 0,
          runsConceded: 0,
          oversBowled: 0,
        };
      });

      const allMatches = [
        ...tournament.matches,
        ...tournament.semiFinals,
        ...(tournament.final ? [tournament.final] : []),
      ];

    
      allMatches.forEach((match, index) => {
        if (match.status === "Completed") {
          const team1Id = match.teams[0]._id.toString();
          const team2Id = match.teams[1]._id.toString();
          const team1Stats = stats[team1Id];
          const team2Stats = stats[team2Id];

          team1Stats.matches++;
          team2Stats.matches++;

          // Handle Map objects explicitly
          const runsScored = match.runsScored instanceof Map ? Object.fromEntries(match.runsScored) : match.runsScored;
          const oversBowled = match.oversBowled instanceof Map ? Object.fromEntries(match.oversBowled) : match.oversBowled;

          const team1RunsInnings1 = runsScored["innings1"] || 0;
          const team1OversInnings1 = oversBowled["innings1"] || (runsScored["innings1"] > 0 ? match.overs : 0);
          const team2RunsInnings2 = runsScored["innings2"] || 0;
          const team2OversInnings2 = oversBowled["innings2"] || (runsScored["innings2"] > 0 ? match.overs : 0);

        

          team1Stats.runsScored += team1RunsInnings1;
          team1Stats.oversFaced += team1OversInnings1;
          team1Stats.runsConceded += team2RunsInnings2;
          team1Stats.oversBowled += team2OversInnings2;

          team2Stats.runsScored += team2RunsInnings2;
          team2Stats.oversFaced += team2OversInnings2;
          team2Stats.runsConceded += team1RunsInnings1;
          team2Stats.oversBowled += team1OversInnings1;

          if (match.winner) {
            const winnerId = match.winner._id.toString();
            if (winnerId === team1Id) {
              team1Stats.points += 2;
            } else if (winnerId === team2Id) {
              team2Stats.points += 2;
            }
          }

         
        }
      });

      

      const pointsTable = Object.entries(stats).map(([teamId, stat]) => {
        const runRateFor = stat.oversFaced > 0 ? stat.runsScored / stat.oversFaced : 0;
        const runRateAgainst = stat.oversBowled > 0 ? stat.runsConceded / stat.oversBowled : 0;
        const nrr = stat.matches > 0 ? runRateFor - runRateAgainst : 0;

       
        return {
          teamId,
          team: stat.team,
          matches: stat.matches,
          points: stat.points,
          nrr: Number(nrr.toFixed(3)),
        };
      });

      pointsTable.sort((a, b) => {
        if (b.points === a.points) {
          return b.nrr - a.nrr;
        }
        return b.points - a.points;
      });

      res.json(pointsTable);
    } catch (error) {
      res.status(500).json({ message: "Error generating points table", error: error.message });
    }
  },

  // New endpoint to update match results (simplified for this context)
  updateMatchResult: async (req, res) => {
    const { matchId, runsScored, oversBowled, winner } = req.body;
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Update match with results
      match.runsScored = new Map(Object.entries(runsScored));
      match.oversBowled = new Map(Object.entries(oversBowled));
      match.winner = winner || null;
      match.status = "Completed";
      
      await match.save();
      res.json({ message: "Match result updated successfully", match });
    } catch (error) {
      res.status(500).json({ message: "Error updating match result", error: error.message });
    }
  },
  getTournamentById: async (req, res) => {
    try {
      const { tournamentId } = req.params;
      const tournament = await Tournament.findById(tournamentId)
        .populate("teams", "name")
        .populate({
          path: "matches",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate({
          path: "semiFinals",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate({
          path: "final",
          populate: [
            { path: "teams", select: "name" },
            { path: "winner", select: "name" },
          ],
        })
        .populate("winner", "name");
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      res.status(200).json(tournament);
    } catch (error) {
      res.status(500).json({ message: "Error fetching tournament", error: error.message });
    }
  },
  getKeyPlayers: async (req, res) => {
    try {
      const { tournamentId } = req.params;

      const tournament = await Tournament.findById(tournamentId)
        .populate({
          path: "matches",
          populate: [{ path: "teams", select: "name" }],
        })
        .populate({
          path: "semiFinals",
          populate: [{ path: "teams", select: "name" }],
        })
        .populate({
          path: "final",
          populate: [{ path: "teams", select: "name" }],
        });

      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const allMatches = [
        ...(tournament.matches || []),
        ...(tournament.semiFinals || []),
        tournament.final ? [tournament.final] : [],
      ].filter(match => match);
      

      const matchIds = allMatches.map(match => match._id);

      // Fetch all scores for these matches
      const scores = await Score.find({ match: { $in: matchIds } })
        .populate("batsman bowler outBatsman team")
        .lean();

      // Collect player IDs from matches and scores
      const playerIds = new Set();
      allMatches.forEach((match) => {
        if (match.currentBatsmen) match.currentBatsmen.forEach(id => playerIds.add(id.toString()));
        if (match.currentBowler) playerIds.add(match.currentBowler.toString());
        if (match.matchStats && match.matchStats instanceof Map) {
          const matchStats = Object.fromEntries(match.matchStats);
          ["innings1", "innings2"].forEach((inningsKey) => {
            const inningsStats = matchStats[inningsKey];
            if (inningsStats?.batting instanceof Map) {
              Array.from(inningsStats.batting.keys()).forEach(id => playerIds.add(id.toString()));
            }
            if (inningsStats?.bowling instanceof Map) {
              Array.from(inningsStats.bowling.keys()).forEach(id => playerIds.add(id.toString()));
            }
          });
        }
      });
      scores.forEach(score => {
        if (score.batsman?._id) playerIds.add(score.batsman._id.toString());
        if (score.bowler?._id) playerIds.add(score.bowler._id.toString());
        if (score.outBatsman?._id) playerIds.add(score.outBatsman._id.toString());
      });

      // Fetch player data
      const players = await Player.find({ _id: { $in: Array.from(playerIds) } }).select("name team");
      const playerMap = players.reduce((map, player) => {
        map[player._id.toString()] = { name: player.name, team: player.team };
        return map;
      }, {});

      const playerStats = {};

      // Aggregate stats from Score data
      scores.forEach(score => {
        const batsmanId = score.batsman?._id?.toString();
        const bowlerId = score.bowler?._id?.toString();

        // Batsman stats
        if (batsmanId) {
          if (!playerStats[batsmanId]) {
            playerStats[batsmanId] = {
              name: playerMap[batsmanId]?.name || `Unknown Batsman ${batsmanId.slice(-4)}`,
              team: playerMap[batsmanId]?.team || score.team?.name || "Unknown",
              runs: 0,
              sixes: 0,
              fours: 0,
              ballsFaced: 0,
              wickets: 0,
              runsConceded: 0,
              oversBowled: 0,
            };
          }
          if (score.ballType === "legal") {
            playerStats[batsmanId].runs += score.runs || 0;
            playerStats[batsmanId].ballsFaced += 1;
            if (score.runs === 6) playerStats[batsmanId].sixes += 1;
            if (score.runs === 4) playerStats[batsmanId].fours += 1;
          }
        }

        // Bowler stats
        if (bowlerId) {
          if (!playerStats[bowlerId]) {
            playerStats[bowlerId] = {
              name: playerMap[bowlerId]?.name || `Unknown Bowler ${bowlerId.slice(-4)}`,
              team: playerMap[bowlerId]?.team || (score.team?._id.equals(allMatches.find(m => m._id.equals(score.match))?.teams[0]) ? allMatches.find(m => m._id.equals(score.match))?.teams[1]?.name : allMatches.find(m => m._id.equals(score.match))?.teams[0]?.name) || "Unknown",
              runs: 0,
              sixes: 0,
              fours: 0,
              ballsFaced: 0,
              wickets: 0,
              runsConceded: 0,
              oversBowled: 0,
            };
          }
          if (score.ballType === "legal") {
            playerStats[bowlerId].runsConceded += score.runs || 0;
            playerStats[bowlerId].oversBowled += 1 / 6; // Increment by 0.1 per legal ball
            if (score.wicket) playerStats[bowlerId].wickets += 1;
          } else if (score.ballType === "wide" || score.ballType === "noBall") {
            playerStats[bowlerId].runsConceded += score.runs || 0;
          }
        }
      });

      // Enhance with Match-level data (if Score data is incomplete)
      allMatches.forEach((match, matchIndex) => {
        

        if (match.runsScored && match.runsScored instanceof Map) {
          const runsScored = Object.fromEntries(match.runsScored);
          ["innings1", "innings2"].forEach((inningsKey, inningsIndex) => {
            if (runsScored[inningsKey] && match.currentBatsmen?.[inningsIndex]) {
              const pid = match.currentBatsmen[inningsIndex].toString();
              if (!playerStats[pid]) {
                playerStats[pid] = {
                  name: playerMap[pid]?.name || `Batsman ${matchIndex + 1}-${inningsIndex + 1}`,
                  team: playerMap[pid]?.team || match.teams[inningsIndex]?.name || "Unknown",
                  runs: 0,
                  sixes: 0,
                  fours: 0,
                  ballsFaced: 0,
                  wickets: 0,
                  runsConceded: 0,
                  oversBowled: 0,
                };
              }
              playerStats[pid].runs += runsScored[inningsKey] || 0;
            }
          });
        }

        if (match.wickets && match.wickets instanceof Map && match.currentBowler) {
          const wickets = Object.fromEntries(match.wickets);
          const pid = match.currentBowler.toString();
          const teamIndex = match.battingTeam === match.teams[0]?._id ? 1 : 0;
          if (!playerStats[pid]) {
            playerStats[pid] = {
              name: playerMap[pid]?.name || `Bowler ${matchIndex + 1}`,
              team: playerMap[pid]?.team || match.teams[teamIndex]?.name || "Unknown",
              runs: 0,
              sixes: 0,
              fours: 0,
              ballsFaced: 0,
              wickets: 0,
              runsConceded: 0,
              oversBowled: 0,
            };
          }
          playerStats[pid].wickets += wickets.innings1 || wickets.innings2 || 0;
          if (match.oversBowled && match.oversBowled instanceof Map) {
            const oversBowled = Object.fromEntries(match.oversBowled);
            playerStats[pid].oversBowled += oversBowled.innings1 || oversBowled.innings2 || 0;
          }
        }

        // MatchStats enhancement
        if (match.matchStats && match.matchStats instanceof Map) {
          const matchStats = Object.fromEntries(match.matchStats);
          
          ["innings1", "innings2"].forEach((inningsKey, inningsIndex) => {
            const inningsStats = matchStats[inningsKey];
            if (!inningsStats) return;

            if (inningsStats.batting && inningsStats.batting instanceof Map) {
              const battingEntries = Array.from(inningsStats.batting.entries());
              battingEntries.forEach(([playerId, stats]) => {
                const pid = playerId.toString();
                if (!playerStats[pid]) {
                  playerStats[pid] = {
                    name: playerMap[pid]?.name || `Batsman ${matchIndex + 1}-${pid.slice(-4)}`,
                    team: playerMap[pid]?.team || match.teams[inningsIndex]?.name || "Unknown",
                    runs: 0,
                    sixes: 0,
                    fours: 0,
                    ballsFaced: 0,
                    wickets: 0,
                    runsConceded: 0,
                    oversBowled: 0,
                  };
                }
                
                playerStats[pid].runs += stats.runs || 0;
                playerStats[pid].ballsFaced += stats.balls || 0;
                playerStats[pid].sixes += stats.runsBreakdown?.["6"] || 0;
                playerStats[pid].fours += stats.runsBreakdown?.["4"] || 0;
              });
            }

            if (inningsStats.bowling && inningsStats.bowling instanceof Map) {
              const bowlingEntries = Array.from(inningsStats.bowling.entries());
              bowlingEntries.forEach(([playerId, stats]) => {
                const pid = playerId.toString();
                const teamIndex = inningsIndex === 0 ? 1 : 0;
                if (!playerStats[pid]) {
                  playerStats[pid] = {
                    name: playerMap[pid]?.name || `Bowler ${matchIndex + 1}-${pid.slice(-4)}`,
                    team: playerMap[pid]?.team || match.teams[teamIndex]?.name || "Unknown",
                    runs: 0,
                    sixes: 0,
                    fours: 0,
                    ballsFaced: 0,
                    wickets: 0,
                    runsConceded: 0,
                    oversBowled: 0,
                  };
                }
                
                playerStats[pid].wickets += stats.wickets || 0;
                playerStats[pid].runsConceded += stats.runs || 0;
                playerStats[pid].oversBowled += (stats.balls || 0) / 6;
              });
            }
          });
        }
      });
      

      const playersArray = Object.values(playerStats).map((player) => ({
        ...player,
        strikeRate: player.ballsFaced > 0 ? (player.runs / player.ballsFaced) * 100 : 0,
        economy: player.oversBowled > 0 ? player.runsConceded / player.oversBowled : 0,
      }));

      const topRunScorers = playersArray
        .sort((a, b) => b.runs - a.runs)
        .map(({ name, team, runs }) => ({ name, team, runs }));
      const topWicketTakers = playersArray
        .sort((a, b) => b.wickets - a.wickets)
        .map(({ name, team, wickets }) => ({ name, team, wickets }));
      const topSixes = playersArray
        .sort((a, b) => b.sixes - a.sixes)
        .map(({ name, team, sixes }) => ({ name, team, sixes }));
      const topFours = playersArray
        .sort((a, b) => b.fours - a.fours)
        .map(({ name, team, fours }) => ({ name, team, fours }));
      const topStrikeRate = playersArray
        .filter((p) => p.ballsFaced > 0)
        .sort((a, b) => b.strikeRate - a.strikeRate)
        .map(({ name, team, strikeRate }) => ({ name, team, strikeRate }));
      const bestEconomy = playersArray
        .filter((p) => p.oversBowled > 0)
        .sort((a, b) => a.economy - b.economy)
        .map(({ name, team, economy }) => ({ name, team, economy }));

      
      
      
      
      
      

      res.status(200).json({
        topRunScorers,
        topWicketTakers,
        topSixes,
        topFours,
        topStrikeRate,
        bestEconomy,
      });
    } catch (error) {
      console.error("Error in getKeyPlayers:", error);
      res.status(500).json({ message: "Error fetching key players", error: error.message });
    }
  },
};

module.exports = tournamentController;