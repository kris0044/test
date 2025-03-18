import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import { FaUserCircle, FaCalendarAlt, FaMapMarkerAlt } from "react-icons/fa";
import "../assets/styles/styles.css";
import api from "../utility/axiosInterceptor.js";

const socket = io(api.defaults.baseURL);

function MatchDetails() {
  const { matchId } = useParams();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [teamForm, setTeamForm] = useState({ team1: [], team2: [] });
  const [headToHead, setHeadToHead] = useState({ team1Wins: 0, team2Wins: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [activeTab, setActiveTab] = useState("Live"); // Default to "Live" for testing
  const [selectedPlayingTeam, setSelectedPlayingTeam] = useState(0);

  useEffect(() => {
    const fetchMatchAndPlayers = async () => {
      try {
        setLoading(true);
        const matchResponse = await api.get(`/api/matches/${matchId}`, {
          params: { populate: "teams winner umpires venue" }, // Added umpires and venue to populate
        });
        const matchData = matchResponse.data || {};
        setMatch(matchData);

        const scoreResponse = await api.get(`/api/scores/match/${matchId}`);
        setScores(scoreResponse.data || []);

        const teamIds = (matchData.teams || []).map((team) => team._id).join(",");
        let playersData = [];
        if (teamIds) {
          const playersResponse = await api.get(`/api/players?teamIds=${teamIds}`);
          playersData = playersResponse.data || [];
          setPlayers(playersData);
        }

        if (matchData.teams && matchData.teams.length >= 2) {
          const team1Form = await api.get(`/api/matches/team/${matchData.teams[0]._id}`, {
            params: { limit: 5 },
          });
          const team2Form = await api.get(`/api/matches/team/${matchData.teams[1]._id}`, {
            params: { limit: 5 },
          });
          setTeamForm({
            team1: team1Form.data,
            team2: team2Form.data,
          });

          const headToHeadResponse = await api.get(`/api/matches/head-to-head`, {
            params: {
              team1Id: matchData.teams[0]._id,
              team2Id: matchData.teams[1]._id,
              limit: 10,
            },
          });
          const matches = headToHeadResponse.data;
          const team1Id = matchData.teams[0]._id;
          const team2Id = matchData.teams[1]._id;
          const team1Wins = matches.filter((m) => {
            if (!m.winner) return false;
            const winnerId = typeof m.winner === "string" ? m.winner : m.winner._id;
            return winnerId && winnerId.toString() === team1Id;
          }).length;
          const team2Wins = matches.filter((m) => {
            if (!m.winner) return false;
            const winnerId = typeof m.winner === "string" ? m.winner : m.winner._id;
            return winnerId && winnerId.toString() === team2Id;
          }).length;
          setHeadToHead({ team1Wins, team2Wins });
        }
      } catch (error) {
        console.error("Error fetching match and players details:", error);
        setHeadToHead({ team1Wins: 0, team2Wins: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchMatchAndPlayers();

    socket.on("matchUpdate", (updatedMatch) => {
      if (updatedMatch._id === matchId) {
        setMatch(updatedMatch || {});
      }
    });

    socket.on("scoreUpdate", (newScore) => {
      if (newScore.match === matchId) {
        setScores((prevScores) => [...prevScores, newScore || {}]);
      }
    });

    return () => {
      socket.off("matchUpdate");
      socket.off("scoreUpdate");
    };
  }, [matchId]);

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (!match || !match.teams || match.teams.length < 2)
    return <div className="text-center py-4">Match not found or teams data unavailable</div>;

  const getPlayerName = (player) => {
    if (!player) return "Unknown Player";
    if (typeof player === "string") {
      const foundPlayer = players.find((p) => p._id === player);
      return foundPlayer ? foundPlayer.name || "Unknown Player" : "Unknown Player";
    }
    return player.name || "Unknown Player";
  };

  const getPlayerId = (player) => {
    if (!player) return null;
    return typeof player === "string" ? player : player._id;
  };

  const getDismissalDetails = (playerId, innings) => {
    const dismissalScore = scores.find(
      (score) =>
        score.innings === innings &&
        score.wicket &&
        (score.outBatsman === playerId || score.outBatsman?._id === playerId)
    );

    if (!dismissalScore) {
      const isCurrent = match.currentBatsmen?.some((b) => getPlayerId(b) === playerId);
      return isCurrent ? "NOT OUT" : "";
    }

    const bowlerName = getPlayerName(dismissalScore.bowler);
    const fielderName = dismissalScore.fielder ? getPlayerName(dismissalScore.fielder) : null;
    const wicketType = dismissalScore.wicketType || "b";

    switch (wicketType.toLowerCase()) {
      case "lbw":
        return `lbw b ${bowlerName}`;
      case "caught":
        return fielderName ? `c ${fielderName} b ${bowlerName}` : `c b ${bowlerName}`;
      case "bowled":
        return `b ${bowlerName}`;
      case "stumped":
        return fielderName ? `st ${fielderName} b ${bowlerName}` : `st b ${bowlerName}`;
      case "run out":
        return fielderName ? `run out (${fielderName})` : `run out`;
      case "hit wicket":
        return `hit wicket b ${bowlerName}`;
      default:
        return `b ${bowlerName}`;
    }
  };

  const calculateInningsStats = (innings) => {
    const stats = {
      batting: {},
      bowling: {},
      extras: { wides: {}, noBalls: {} },
      runs: 0,
      wickets: 0,
      balls: 0,
    };

    scores
      .filter((score) => score.innings === innings)
      .forEach((score) => {
        const batsmanId = typeof score.batsman === "string" ? score.batsman : score.batsman?._id;
        const bowlerId = typeof score.bowler === "string" ? score.bowler : score.bowler?._id;

        if (batsmanId) {
          stats.batting[batsmanId] = stats.batting[batsmanId] || {
            runs: 0,
            balls: 0,
            runsBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          };
          stats.batting[batsmanId].runs += score.runs || 0;
          if (score.ballType === "legal") {
            stats.batting[batsmanId].balls += 1;
            if (score.runs > 0 && score.runs <= 6) {
              stats.batting[batsmanId].runsBreakdown[score.runs] =
                (stats.batting[batsmanId].runsBreakdown[score.runs] || 0) + 1;
            }
          } else if (score.ballType === "noBall" && score.runs > 1) {
            stats.batting[batsmanId].runs += score.runs - 1;
            if (score.runs - 1 <= 6) {
              stats.batting[batsmanId].runsBreakdown[score.runs - 1] =
                (stats.batting[batsmanId].runsBreakdown[score.runs - 1] || 0) + 1;
            }
          }
        }

        if (bowlerId) {
          stats.bowling[bowlerId] = stats.bowling[bowlerId] || {
            runs: 0,
            balls: 0,
            wickets: 0,
          };
          stats.bowling[bowlerId].runs += score.runs || 0;
          if (score.ballType === "legal") {
            stats.bowling[bowlerId].balls += 1;
          }
          if (score.wicket && score.wicketType !== "run out") {
            stats.bowling[bowlerId].wickets += 1;
          }
        }

        if (score.ballType === "wide" && bowlerId) {
          stats.extras.wides[bowlerId] = (stats.extras.wides[bowlerId] || 0) + (score.runs || 1);
        }
        if (score.ballType === "noBall" && bowlerId) {
          stats.extras.noBalls[bowlerId] = (stats.extras.noBalls[bowlerId] || 0) + (score.runs || 1);
        }

        stats.runs += score.runs || 0;
        if (score.wicket) stats.wickets += 1;
        if (score.ballType === "legal") stats.balls += 1;
      });

    stats.overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
    return stats;
  };

  const calculateExtras = (stats) => {
    const wides = Object.values(stats.extras.wides || {}).reduce((sum, val) => sum + val, 0);
    const noBalls = Object.values(stats.extras.noBalls || {}).reduce((sum, val) => sum + val, 0);
    return { total: wides + noBalls, wides, noBalls, byes: 0, legByes: 0 };
  };

  const getBattingTeamIndex = (inning) => {
    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;

    if (tossWinnerIndex === -1) return inning === 1 ? 0 : 1;

    if (match.tossChoice === "bat") {
      return inning === 1 ? tossWinnerIndex : otherTeamIndex;
    } else {
      return inning === 1 ? otherTeamIndex : tossWinnerIndex;
    }
  };

  const yetToBat = (innings) => {
    const battingTeamIndex = getBattingTeamIndex(innings);
    const battingTeam = match.teams[battingTeamIndex];
    if (!battingTeam || !battingTeam.name) return [];

    const teamPlayers = players.filter((p) => p.team === battingTeam.name);

    const battedPlayerIds = scores
      .filter((score) => score.innings === innings)
      .map((score) => score.batsman?._id || score.batsman)
      .filter((id) => id && players.find((p) => p._id === id)?.team === battingTeam.name);

    return teamPlayers
      .filter((p) => !battedPlayerIds.includes(p._id))
      .map((p) => ({ name: getPlayerName(p._id), team: battingTeam._id }));
  };

  const fallOfWickets = (innings) => {
    return scores
      .filter((score) => score?.wicket && score?.outBatsman && score.innings === innings)
      .map((score) => {
        const totalRuns = scores
          .filter((s) => s.innings === score.innings && s.timestamp <= score.timestamp)
          .reduce((sum, s) => sum + (s.runs || 0), 0);
        const legalBalls = scores
          .filter(
            (s) =>
              s.innings === score.innings &&
              s.ballType === "legal" &&
              s.timestamp <= score.timestamp
          ).length;
        const overs = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;

        return {
          player: getPlayerName(score.outBatsman?._id || score.outBatsman),
          runs: totalRuns,
          overs: overs.toFixed(1),
          wicketNumber: scores.filter(
            (s) => s.innings === score.innings && s.wicket && s.timestamp <= score.timestamp
          ).length,
        };
      });
  };

  const calculatePartnerships = (innings) => {
    const partnerships = [];
    const inningsScores = scores
      .filter((score) => score.innings === innings)
      .sort((a, b) => a.timestamp - b.timestamp);

    let currentBatsmen = [];
    let partnershipRuns = 0;
    let partnershipBalls = 0;

    inningsScores.forEach((score, index) => {
      const batsmanId = typeof score.batsman === "string" ? score.batsman : score.batsman?._id;

      if (currentBatsmen.length < 2 && batsmanId) {
        if (!currentBatsmen.includes(batsmanId)) {
          currentBatsmen.push(batsmanId);
        }
      }

      if (currentBatsmen.length === 2) {
        partnershipRuns += score.runs || 0;
        if (score.ballType === "legal") {
          partnershipBalls += 1;
        }
      }

      if (score.wicket && score.outBatsman) {
        const outBatsmanId =
          typeof score.outBatsman === "string" ? score.outBatsman : score.outBatsman._id;

        if (currentBatsmen.includes(outBatsmanId) && currentBatsmen.length === 2) {
          partnerships.push({
            batsmen: [...currentBatsmen],
            runs: partnershipRuns,
            balls: partnershipBalls,
          });

          currentBatsmen = currentBatsmen.filter((id) => id !== outBatsmanId);

          const remainingScores = inningsScores.slice(index + 1);
          const nextBatsman = remainingScores.find(
            (s) =>
              s.batsman &&
              !currentBatsmen.includes(
                typeof s.batsman === "string" ? s.batsman : s.batsman._id
              ) &&
              (typeof s.batsman === "string" ? s.batsman : s.batsman._id) !== outBatsmanId
          );

          if (nextBatsman) {
            const nextBatsmanId =
              typeof nextBatsman.batsman === "string" ? nextBatsman.batsman : nextBatsman.batsman._id;
            if (nextBatsmanId) {
              currentBatsmen.push(nextBatsmanId);
            }
          }

          partnershipRuns = 0;
          partnershipBalls = 0;
        }
      }

      if (index === inningsScores.length - 1 && currentBatsmen.length === 2 && partnershipRuns > 0) {
        partnerships.push({
          batsmen: [...currentBatsmen],
          runs: partnershipRuns,
          balls: partnershipBalls,
        });
      }
    });

    return partnerships;
  };

  const handleTeamClick = (teamIndex) => {
    setSelectedTeam(teamIndex);
  };

  const handlePlayingTeamClick = (teamIndex) => {
    setSelectedPlayingTeam(teamIndex);
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const getInningsForTeam = (teamIndex) => {
    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;

    if (tossWinnerIndex === -1) return [teamIndex + 1];

    if (match.format === "Test") {
      return teamIndex === tossWinnerIndex && match.tossChoice === "bat"
        ? [1, 3]
        : teamIndex === otherTeamIndex && match.tossChoice === "bowl"
        ? [1, 3]
        : [2, 4];
    }
    return teamIndex === tossWinnerIndex && match.tossChoice === "bat"
      ? [1]
      : teamIndex === otherTeamIndex && match.tossChoice === "bowl"
      ? [1]
      : [2];
  };

  const getTossUpdate = () => {
    const tossWinnerTeam = match.teams.find((team) => team._id === match.tossWinner);
    const tossWinnerName = tossWinnerTeam ? tossWinnerTeam.name : "Unknown Team";
    return `${tossWinnerName} won the toss and chose to ${match.tossChoice === "bat" ? "bat" : "bowl"}`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getTeamForm = (teamMatches, teamId) => {
    return teamMatches.map((match) => {
      if (!match.winner) return "L";
      const winnerId = typeof match.winner === "string" ? match.winner : match.winner._id;
      return winnerId && winnerId.toString() === teamId.toString() ? "W" : "L";
    });
  };

  const getWinningMargin = () => {
    if (!match.winner || !match.runsScored || !match.wickets) return null;

    const winnerId = typeof match.winner === "string" ? match.winner : match.winner._id;
    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;

    let firstBattingTeamIndex;
    if (tossWinnerIndex === -1) {
      firstBattingTeamIndex = 0;
    } else if (match.tossChoice === "bat") {
      firstBattingTeamIndex = tossWinnerIndex;
    } else {
      firstBattingTeamIndex = otherTeamIndex;
    }

    const secondBattingTeamIndex = firstBattingTeamIndex === 0 ? 1 : 0;

    const winnerTeam = match.teams.find((team) => team._id === winnerId);
    const winnerName = winnerTeam ? winnerTeam.name : "Unknown Team";
    const winnerIndex = match.teams.findIndex((team) => team._id === winnerId);

    if (winnerIndex === firstBattingTeamIndex) {
      const runsMargin = (match.runsScored.innings1 || 0) - (match.runsScored.innings2 || 0);
      return `${winnerName} won by ${runsMargin} runs`;
    } else if (winnerIndex === secondBattingTeamIndex) {
      const wicketsTaken = match.wickets.innings2 || 0;
      const wicketsRemaining = 10 - wicketsTaken;
      return `${winnerName} won by ${wicketsRemaining} wickets`;
    }

    return null;
  };

  const calculateRunRateAndProjections = (innings) => {
    const inningsStats = calculateInningsStats(innings);
    const ballsBowled = inningsStats.balls || 0;
    const runsScored = inningsStats.runs || 0;
    const oversBowled = inningsStats.overs || 0;

    const currentRunRate = ballsBowled > 0 ? (runsScored / (ballsBowled / 6)).toFixed(2) : 0;

    const runRates = [
      parseFloat(currentRunRate),
      parseFloat(currentRunRate) - 0.5 > 0 ? (parseFloat(currentRunRate) - 0.5).toFixed(2) : 0,
      (parseFloat(currentRunRate) + 0.5).toFixed(2),
      (parseFloat(currentRunRate) + 1.0).toFixed(2),
    ];

    const projectionPoints = [];
    if (oversBowled < 20) projectionPoints.push(20);
    if (oversBowled < 30) projectionPoints.push(30);
    if (oversBowled < 40) projectionPoints.push(40);
    if (oversBowled < 50) projectionPoints.push(50);

    const projections = {};
    projectionPoints.forEach((overs) => {
      projections[overs] = runRates.map((rr) => {
        const additionalRuns = rr * (overs - oversBowled);
        return oversBowled <= overs ? Math.round(runsScored + additionalRuns) : runsScored;
      });
    });

    return { currentRunRate, projections, runRates, projectionPoints };
  };

  const calculateWinProbability = (innings) => {
    const inningsStats = calculateInningsStats(innings);
    const runsScored = inningsStats.runs || 0;
    const wickets = inningsStats.wickets || 0;
    const oversBowled = inningsStats.overs || 0;

    const totalOvers = 50;
    const target = match.target || 200;
    const remainingOvers = totalOvers - oversBowled;
    const remainingWickets = 10 - wickets;

    const runsNeeded = target - runsScored;
    const requiredRunRate = remainingOvers > 0 ? runsNeeded / remainingOvers : 0;
    const currentRunRate = oversBowled > 0 ? runsScored / oversBowled : 0;

    let battingTeamProbability = 50;
    if (remainingOvers > 0 && requiredRunRate > 0) {
      const runRateFactor = (currentRunRate - requiredRunRate) * 5;
      const wicketFactor = remainingWickets * 3;
      const oversFactor = (remainingOvers / totalOvers) * 20;

      battingTeamProbability = 50 + runRateFactor + wicketFactor - oversFactor;
      battingTeamProbability = Math.min(100, Math.max(0, battingTeamProbability));
    }

    return {
      battingTeam: Math.round(battingTeamProbability),
      bowlingTeam: Math.round(100 - battingTeamProbability),
    };
  };

  const getCurrentInning = () => {
    const hasInning2 = scores.some((score) => score.innings === 2);
    return hasInning2 ? 2 : 1;
  };

  const getLatestBowlerOver = (inning, bowlerId) => {
    const bowlerScores = scores
      .filter((score) => score.innings === inning && (score.bowler === bowlerId || score.bowler?._id === bowlerId))
      .sort((a, b) => (b.over || 0) - (a.over || 0));

    if (bowlerScores.length === 0) return null;
    return bowlerScores[0].over;
  };

  const getBowlerOverStats = (inning, over, bowlerId) => {
    const overScores = scores.filter(
      (score) =>
        score.innings === inning &&
        score.over === over &&
        (score.bowler === bowlerId || score.bowler?._id === bowlerId)
    );

    const runs = overScores.reduce((sum, score) => sum + (score.runs || 0), 0);
    const wickets = overScores.filter((score) => score.wicket && score.wicketType !== "run out").length;
    const legalBalls = overScores.filter((score) => score.ballType === "legal").length;
    const overs = legalBalls > 0 ? (legalBalls / 6).toFixed(1) : "0.0";

    return `${wickets}-${runs}(${overs})`;
  };

  return (
    <div className="d-flex flex-column min-vh-100 match-details-container">
      <Header />
      <div className="container py-4">
        <nav className="navbar navbar-expand-lg navbar-dark mb-4">
          <div className="container-fluid">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "Match info" ? "active" : ""}`}
                  onClick={() => handleTabClick("Match info")}
                >
                  Match info
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "Live" ? "active" : ""}`}
                  onClick={() => handleTabClick("Live")}
                >
                  Live
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "Scorecard" ? "active" : ""}`}
                  onClick={() => handleTabClick("Scorecard")}
                >
                  Scorecard
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {activeTab === "Scorecard" && (
          <div className="d-flex justify-content-between">
            <div className="flex-grow-1 me-3 match-card-container">
              <div className="card shadow-sm mb-4 match-card">
                <div className="card-header d-flex justify-content-between align-items-center bg-dark text-white match-header">
                  <div className="d-flex align-items-center">
                    <button
                      className={`btn btn-sm me-2 ${selectedTeam === 0 ? "btn-primary" : "btn-outline-light"}`}
                      onClick={() => handleTeamClick(0)}
                    >
                      {match.teams[0]?.name || "Team 1"}
                    </button>
                    <button
                      className={`btn btn-sm ${selectedTeam === 1 ? "btn-primary" : "btn-outline-light"}`}
                      onClick={() => handleTeamClick(1)}
                    >
                      {match.teams[1]?.name || "Team 2"}
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {getInningsForTeam(selectedTeam).map((inning) => {
                    const battingTeamIndex = getBattingTeamIndex(inning);
                    const bowlingTeamIndex = battingTeamIndex === 0 ? 1 : 0;
                    const battingTeam = match.teams[battingTeamIndex];
                    const bowlingTeam = match.teams[bowlingTeamIndex];
                    const inningsStats = calculateInningsStats(inning);
                    const extras = calculateExtras(inningsStats);

                    return (
                      <div key={inning} className="mb-4">
                        <h3 className="h6">
                          Batting - {battingTeam?.name || `Team ${battingTeamIndex + 1}`}{" "}
                          {`(${inningsStats.runs}/${inningsStats.wickets}, ${inningsStats.overs.toFixed(1)} overs)`}
                        </h3>
                        <div className="table-responsive">
                          <table className="table table-bordered table-sm match-table">
                            <thead>
                              <tr>
                                <th>Batter</th>
                                <th>Dismissal</th>
                                <th>R</th>
                                <th>B</th>
                                <th>4s</th>
                                <th>6s</th>
                                <th>SR</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(inningsStats.batting).length > 0 ? (
                                Object.entries(inningsStats.batting).map(([playerId, stats]) => {
                                  const playerName = getPlayerName(playerId);
                                  const isCurrent = match.currentBatsmen?.some((b) => getPlayerId(b) === playerId);
                                  const dismissal = getDismissalDetails(playerId, inning);

                                  return (
                                    <tr key={playerId}>
                                      <td>
                                        {playerName} {isCurrent ? "*" : ""}
                                      </td>
                                      <td>{dismissal || "NOT OUT"}</td>
                                      <td>{stats.runs || 0}</td>
                                      <td>{stats.balls || 0}</td>
                                      <td>{stats.runsBreakdown?.[4] || 0}</td>
                                      <td>{stats.runsBreakdown?.[6] || 0}</td>
                                      <td>
                                        {stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : "0.00"}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="7">No batting data available</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <h3 className="h6 mt-3">Bowling - {bowlingTeam?.name || `Team ${bowlingTeamIndex + 1}`}</h3>
                        <div className="table-responsive">
                          <table className="table table-bordered table-sm match-table">
                            <thead>
                              <tr>
                                <th>Bowler</th>
                                <th>O</th>
                                <th>M</th>
                                <th>R</th>
                                <th>W</th>
                                <th>ER</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(inningsStats.bowling).length > 0 ? (
                                Object.entries(inningsStats.bowling).map(([playerId, stats]) => {
                                  const playerName = getPlayerName(playerId);
                                  const isCurrent = getPlayerId(match.currentBowler) === playerId;
                                  return (
                                    <tr key={playerId}>
                                      <td>
                                        {playerName} {isCurrent ? "*" : ""}
                                      </td>
                                      <td>{(stats.balls / 6).toFixed(1)}</td>
                                      <td>{stats.maidenOvers || 0}</td>
                                      <td>{stats.runs || 0}</td>
                                      <td>{stats.wickets || 0}</td>
                                      <td>
                                        {stats.balls > 0 ? (stats.runs / (stats.balls / 6)).toFixed(2) : "0.00"}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="6">No bowling data available</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <h3 className="h6 mt-3">Extras</h3>
                        <p className="small">
                          {extras.total || 0} (b {extras.byes || 0}, lb {extras.legByes || 0}, w {extras.wides || 0}, nb{" "}
                          {extras.noBalls || 0}, p 0)
                        </p>

                        <h3 className="h6 mt-3">Fall of Wickets</h3>
                        {fallOfWickets(inning).length > 0 ? (
                          <table className="table table-bordered table-sm match-table">
                            <thead>
                              <tr>
                                <th>Wicket</th>
                                <th>Player</th>
                                <th>Runs</th>
                                <th>Overs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {fallOfWickets(inning).map((fow, index) => (
                                <tr key={`${inning}-${index}`}>
                                  <td>{fow.wicketNumber}</td>
                                  <td>{fow.player}</td>
                                  <td>{fow.runs}</td>
                                  <td>{fow.overs}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="small">No wickets yet for Inning {inning}</p>
                        )}

                        <h3 className="h6 mt-3">Partnerships</h3>
                        {calculatePartnerships(inning).length > 0 ? (
                          <table className="table table-bordered table-sm match-table">
                            <thead>
                              <tr>
                                <th>Wicket</th>
                                <th>Batsmen</th>
                                <th>Runs</th>
                                <th>Balls</th>
                              </tr>
                            </thead>
                            <tbody>
                              {calculatePartnerships(inning).map((partnership, index) => (
                                <tr key={`${inning}-${index}`}>
                                  <td>{index + 1}</td>
                                  <td>
                                    {getPlayerName(partnership.batsmen[0])} &{" "}
                                    {getPlayerName(partnership.batsmen[1])}
                                  </td>
                                  <td>{partnership.runs}</td>
                                  <td>{partnership.balls}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="small">No partnerships data available for Inning {inning}</p>
                        )}
                      </div>
                    );
                  })}
                  {match.winner && (
                    <div className="card-footer bg-light">
                      <p className="small fw-bold">Winner: {match.winner?.name || "TBD"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedTeam !== null && (
              <div className="yet-to-bat-container">
                <h2 className="h5 mb-3">Yet to bat</h2>
                <div className="d-flex flex-wrap justify-content-between">
                  {getInningsForTeam(selectedTeam).flatMap((inning) =>
                    yetToBat(inning).length > 0 ? (
                      yetToBat(inning).map((player, index) => (
                        <div key={`${inning}-${index}`} className="player-avatar d-flex flex-column align-items-center mb-3">
                          <FaUserCircle size={40} className="text-muted" />
                          <p className="small mb-0 text-center">{player.name || "Unknown Player"} (Inning {inning})</p>
                        </div>
                      ))
                    ) : (
                      <p key={inning} className="small text-center">No players yet to bat for Inning {inning}</p>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "Match info" && (
          <div className="match-info-container d-flex flex-row">
            <div className="match-details-container flex-grow-1 me-4">
              <div className="match-header mb-4">
                <div className="d-flex align-items-center mb-2">
                  <h2 className="match-title mb-0">{match.matchType || "N/A"}</h2>
                  <span className="tournament-name ms-2">{match.tournament?.name || "N/A"}</span>
                </div>
                <div className="match-details">
                  <div className="d-flex align-items-center mb-2">
                    <FaCalendarAlt className="me-2 text-muted" style={{ fontSize: "16px" }} />
                    <span className="text-muted small">{formatDateTime(match.createdAt)}</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FaMapMarkerAlt className="me-2 text-muted" style={{ fontSize: "16px" }} />
                    <span className="text-muted small">{match.venue?.name || "Venue TBD"}</span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FaUserCircle className="me-2 text-muted" style={{ fontSize: "16px" }} />
                    <span className="text-muted small">
                      Umpires: {match.umpires?.length > 0 ? match.umpires.map((u) => u.name).join(", ") : "Not Assigned"}
                    </span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <FaUserCircle className="me-2 text-muted" style={{ fontSize: "16px" }} />
                    <span className="text-muted small">Referee: {match.referee || "Not Assigned"}</span>
                  </div>
                  <p className="toss-result small mb-0">{getTossUpdate()}</p>
                  {match.winner && match.status === "Completed" && (
                    <p className="match-result mt-2">{getWinningMargin() || "Winner declared, but margin not available"}</p>
                  )}
                </div>
              </div>

              <div className="team-form mb-4">
                <h3 className="section-title mb-3">Team Form (Last 5 matches)</h3>
                <div className="team-form-row d-flex align-items-center mb-3">
                  <div className="team-info d-flex align-items-center me-3">
                    <span className={`flag flag-${match.teams[0].name.toLowerCase()}`} />
                    <span className="team-name ms-2">{match.teams[0].name}</span>
                  </div>
                  {getTeamForm(teamForm.team1, match.teams[0]._id).map((result, index) => (
                    <span
                      key={index}
                      className={`form-badge ${result === "W" ? "bg-success" : "bg-danger"} me-1`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
                <div className="team-form-row d-flex align-items-center">
                  <div className="team-info d-flex align-items-center me-3">
                    <span className={`flag flag-${match.teams[1].name.toLowerCase()}`} />
                    <span className="team-name ms-2">{match.teams[1].name}</span>
                  </div>
                  {getTeamForm(teamForm.team2, match.teams[1]._id).map((result, index) => (
                    <span
                      key={index}
                      className={`form-badge ${result === "W" ? "bg-success" : "bg-danger"} me-1`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              </div>

              <div className="head-to-head">
                <h3 className="section-title mb-3">Head to Head (Last 10 matches)</h3>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="team-name">{match.teams[0].name}</span>
                  <span className="match-score">{headToHead.team1Wins} - {headToHead.team2Wins}</span>
                  <span className="team-name">{match.teams[1].name}</span>
                </div>
              </div>
            </div>

            <div className="playing-xi-container">
              <h3 className="section-title mb-3">Playing XI</h3>
              <div className="team-buttons mb-3">
                <button
                  className={`btn btn-sm me-2 ${selectedPlayingTeam === 0 ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => handlePlayingTeamClick(0)}
                >
                  {match.teams[0].name.toUpperCase()}
                </button>
                <button
                  className={`btn btn-sm ${selectedPlayingTeam === 1 ? "btn-primary" : "btn-outline-primary"}`}
                  onClick={() => handlePlayingTeamClick(1)}
                >
                  {match.teams[1].name.toUpperCase()}
                </button>
              </div>
              <div className="player-list">
                {players
                  .filter((player) => player.team === match.teams[selectedPlayingTeam].name)
                  .map((player, index) => (
                    <div key={index} className="player-item d-flex align-items-center mb-2">
                      <FaUserCircle className="me-2 text-muted" style={{ fontSize: "24px" }} />
                      <span className="player-name">{player.name}</span>
                      <span className="player-role ms-2 text-muted small">{player.role || "All Rounder"}</span>
                    </div>
                  ))}
                {players.filter((player) => player.team === match.teams[selectedPlayingTeam].name).length === 0 && (
                  <p className="text-muted small">No players available for this team.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Live" && (
          <div className="live-section d-flex flex-row">
            <div className="live-players-container flex-grow-1 me-4">
              {(() => {
                const inning = getCurrentInning();
                const battingTeamIndex = getBattingTeamIndex(inning);
                const bowlingTeamIndex = battingTeamIndex === 0 ? 1 : 0;
                const battingTeam = match.teams[battingTeamIndex];
                const bowlingTeam = match.teams[bowlingTeamIndex];
                const inningsStats = calculateInningsStats(inning);
                const bowlerId = getPlayerId(match.currentBowler);
                const latestBowlerOver = getLatestBowlerOver(inning, bowlerId);

                const getPlayerStatsForMatch = (playerId) => {
                  const playerScores = scores.filter(
                    (score) =>
                      score.innings === inning &&
                      (score.batsman === playerId || score.batsman?._id === playerId)
                  );
                  const runs = playerScores.reduce((sum, score) => sum + (score.runs || 0), 0);
                  const balls = playerScores.filter((score) => score.ballType === "legal").length;
                  return { runs, balls };
                };

                const getBowlerStatsForMatch = (bowlerId, over) => {
                  const overScores = scores.filter(
                    (score) =>
                      score.innings === inning &&
                      score.over === over &&
                      (score.bowler === bowlerId || score.bowler?._id === bowlerId)
                  );
                  const runs = overScores.reduce((sum, score) => sum + (score.runs || 0), 0);
                  const wickets = overScores.filter((score) => score.wicket && score.wicketType !== "run out").length;
                  const legalBalls = overScores.filter((score) => score.ballType === "legal").length;
                  const overs = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
                  return `${wickets}-${runs} (${overs})`;
                };

                const strikerStats =
                  match.currentBatsmen && match.currentBatsmen[0]
                    ? getPlayerStatsForMatch(getPlayerId(match.currentBatsmen[0]))
                    : { runs: 0, balls: 0 };
                const nonStrikerStats =
                  match.currentBatsmen && match.currentBatsmen[1]
                    ? getPlayerStatsForMatch(getPlayerId(match.currentBatsmen[1]))
                    : { runs: 0, balls: 0 };
                const bowlerStats =
                  match.currentBowler && latestBowlerOver !== null
                    ? getBowlerStatsForMatch(bowlerId, latestBowlerOver)
                    : "0-0 (0.0)";

                return (
                  <div key={inning} className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="h6 mb-0">{battingTeam?.name || `Team ${battingTeamIndex + 1}`}</h3>
                      <span className="text-muted small">
                        {inningsStats.runs}/{inningsStats.wickets} ({inningsStats.overs.toFixed(1)} overs)
                      </span>
                    </div>

                    <div className="current-players d-flex justify-content-between mb-4">
                      {match.currentBatsmen && match.currentBatsmen.length >= 2 ? (
                        <>
                          <div className="player-card text-center">
                            <FaUserCircle size={40} className="text-muted mb-2" />
                            <p className="player-name mb-1">{getPlayerName(match.currentBatsmen[0])}</p>
                            <p className="player-stats small">
                              {strikerStats.runs}({strikerStats.balls})
                            </p>
                          </div>
                          <div className="player-card text-center">
                            <FaUserCircle size={40} className="text-muted mb-2" />
                            <p className="player-name mb-1">{getPlayerName(match.currentBatsmen[1])}</p>
                            <p className="player-stats small">
                              {nonStrikerStats.runs}({nonStrikerStats.balls})
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted small">No current batsmen available</p>
                      )}
                      {match.currentBowler && latestBowlerOver !== null ? (
                        <div className="player-card text-center">
                          <FaUserCircle size={40} className="text-muted mb-2" />
                          <p className="player-name mb-1">{getPlayerName(match.currentBowler)}</p>
                          <p className="player-stats small">{bowlerStats}</p>
                        </div>
                      ) : (
                        <p className="text-muted small">No current bowler or over data available</p>
                      )}
                    </div>

                    <div className="this-over mt-3">
                      <h4 className="h6 mb-2">Current Over</h4>
                      <div className="d-flex justify-content-around align-items-center">
                        {latestBowlerOver !== null ? (
                          <>
                            {scores
                              .filter((score) => score.innings === inning && score.over === latestBowlerOver)
                              .sort((a, b) => (a.ball || 0) - (b.ball || 0))
                              .map((score, index) => (
                                <span
                                  key={index}
                                  className={`over-ball ${
                                    score.wicket ? "bg-danger" : score.runs === 0 ? "bg-dark" : "bg-success"
                                  }`}
                                >
                                  {score.wicket ? "W" : score.runs || "0"}
                                </span>
                              ))}
                            {Array.from({
                              length: 6 - scores.filter((score) => score.innings === inning && score.over === latestBowlerOver).length,
                            }).map((_, index) => (
                              <span key={`empty-${index}`} className="over-ball bg-light border border-dark"></span>
                            ))}
                            <span className="over-total ms-2">
                              ={" "}
                              {scores
                                .filter((score) => score.innings === inning && score.over === latestBowlerOver)
                                .reduce((sum, score) => sum + (score.runs || 0), 0)}
                            </span>
                          </>
                        ) : (
                          <p className="text-muted small">No over data available for current bowler</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="predictor-container">
              {(() => {
                const inning = getCurrentInning();
                const { currentRunRate, projections, runRates, projectionPoints } =
                  calculateRunRateAndProjections(inning);
                const winProbability = calculateWinProbability(inning);
                const battingTeamIndex = getBattingTeamIndex(inning);
                const bowlingTeamIndex = battingTeamIndex === 0 ? 1 : 0;
                const battingTeam = match.teams[battingTeamIndex];
                const bowlingTeam = match.teams[bowlingTeamIndex];

                return (
                  <div key={inning}>
                    <div className="probability-section mb-4">
                      <h4 className="section-title mb-3">Probability</h4>
                      <div className="d-flex justify-content-between mb-2">
                        <span>{battingTeam.name.toUpperCase()}</span>
                        <span>{bowlingTeam.name.toUpperCase()}</span>
                      </div>
                      <div className="probability-bar">
                        <div
                          className="probability-fill batting-team"
                          style={{ width: `${winProbability.battingTeam}%` }}
                        ></div>
                        <div
                          className="probability-fill bowling-team"
                          style={{ width: `${winProbability.bowlingTeam}%` }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>{winProbability.battingTeam}%</span>
                        <span>{winProbability.bowlingTeam}%</span>
                      </div>
                    </div>

                    <div className="projected-score-section">
                      <h4 className="section-title mb-3">Projected Score as per RR</h4>
                      {projectionPoints.length > 0 ? (
                        <table className="projected-score-table">
                          <thead>
                            <tr>
                              <th></th>
                              {runRates.map((rr, index) => (
                                <th key={index}>{rr}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {projectionPoints.map((overs) => (
                              <tr key={overs}>
                                <td>{overs} Overs</td>
                                {projections[overs].map((score, index) => (
                                  <td key={index}>{score}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-muted small">Match has completed all overs.</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MatchDetails;