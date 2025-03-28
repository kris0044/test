import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
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
  const [activeTab, setActiveTab] = useState("Live");
  const [selectedPlayingTeam, setSelectedPlayingTeam] = useState(0);

  useEffect(() => {
    const fetchMatchAndPlayers = async () => {
      try {
        setLoading(true);
        const matchResponse = await api.get(`/api/matches/${matchId}`, {
          params: { populate: "teams winner umpires venue playing11" },
        });
        const matchData = matchResponse.data || {};
        console.log("Full match data:", matchData);
        console.log("match.playing11:", matchData.playing11);
        console.log("scores:", matchData.scores);
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
          const team1Form = await api.get(`/api/matches/team/${matchData.teams[0]._id}`, { params: { limit: 5 } });
          const team2Form = await api.get(`/api/matches/team/${matchData.teams[1]._id}`, { params: { limit: 5 } });
          setTeamForm({ team1: team1Form.data, team2: team2Form.data });

          const headToHeadResponse = await api.get(`/api/matches/head-to-head`, {
            params: { team1Id: matchData.teams[0]._id, team2Id: matchData.teams[1]._id, limit: 10 },
          });
          const matches = headToHeadResponse.data;
          const team1Wins = matches.filter((m) => m.winner?._id === matchData.teams[0]._id).length;
          const team2Wins = matches.filter((m) => m.winner?._id === matchData.teams[1]._id).length;
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
      if (updatedMatch._id === matchId) setMatch(updatedMatch || {});
    });

    socket.on("scoreUpdate", (newScore) => {
      if (newScore.match === matchId) setScores((prev) => [...prev, newScore || {}]);
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
      case "lbw": return `lbw b ${bowlerName}`;
      case "caught": return fielderName ? `c ${fielderName} b ${bowlerName}` : `c b ${bowlerName}`;
      case "bowled": return `b ${bowlerName}`;
      case "stumped": return fielderName ? `st ${fielderName} b ${bowlerName}` : `st b ${bowlerName}`;
      case "run out": return fielderName ? `run out (${fielderName})` : `run out`;
      case "hit wicket": return `hit wicket b ${bowlerName}`;
      default: return `b ${bowlerName}`;
    }
  };

  const calculateInningsStats = (innings) => {
    const stats = {
      batting: {},
      bowling: {},
      extras: { wides: {}, noBalls: {}, byes: 0, legByes: 0 },
      runs: 0,
      wickets: 0,
      balls: 0,
    };

    scores
      .filter((score) => score.innings === innings)
      .forEach((score) => {
        const batsmanId = getPlayerId(score.batsman);
        const bowlerId = getPlayerId(score.bowler);

        stats.runs += score.runs || 0;

        if (batsmanId) {
          stats.batting[batsmanId] = stats.batting[batsmanId] || {
            runs: 0,
            balls: 0,
            runsBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
          };
          if (score.ballType === "legal") {
            stats.batting[batsmanId].runs += score.runs || 0;
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
          stats.bowling[bowlerId] = stats.bowling[bowlerId] || { runs: 0, balls: 0, wickets: 0 };
          stats.bowling[bowlerId].runs += score.runs || 0;
          if (score.ballType === "legal") stats.bowling[bowlerId].balls += 1;
          if (score.wicket && score.wicketType !== "run out") stats.bowling[bowlerId].wickets += 1;
        }

        if (score.ballType === "wide" && bowlerId) stats.extras.wides[bowlerId] = (stats.extras.wides[bowlerId] || 0) + (score.runs || 1);
        else if (score.ballType === "noBall" && bowlerId) stats.extras.noBalls[bowlerId] = (stats.extras.noBalls[bowlerId] || 0) + 1;
        else if (score.ballType === "bye") stats.extras.byes += score.runs || 0;
        else if (score.ballType === "legBye") stats.extras.legByes += score.runs || 0;

        if (score.wicket) stats.wickets += 1;
        if (score.ballType === "legal") stats.balls += 1;
      });

    stats.overs = Math.floor(stats.balls / 6) + (stats.balls % 6) / 10;
    return stats;
  };

  const calculateExtras = (stats) => {
    const wides = Object.values(stats.extras.wides || {}).reduce((sum, val) => sum + val, 0);
    const noBalls = Object.values(stats.extras.noBalls || {}).reduce((sum, val) => sum + val, 0);
    const byes = stats.extras.byes || 0;
    const legByes = stats.extras.legByes || 0;
    return { total: wides + noBalls + byes + legByes, wides, noBalls, byes, legByes };
  };

  const getBattingTeamIndex = (inning) => {
    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;
    if (tossWinnerIndex === -1) return inning === 1 ? 0 : 1;
    return match.tossChoice === "bat" ? (inning === 1 ? tossWinnerIndex : otherTeamIndex) : (inning === 1 ? otherTeamIndex : tossWinnerIndex);
  };

  const getPlaying11 = (teamId) => {
    if (!match.playing11) return [];
    if (match.playing11 instanceof Map) return match.playing11.get(teamId.toString()) || [];
    return match.playing11[teamId.toString()] || [];
  };

  const getTeamPlayers = (teamId) => {
    return players.filter((p) => p.team === match.teams.find((t) => t._id === teamId)?.name) || [];
  };

  const yetToBat = (innings) => {
    const battingTeamIndex = getBattingTeamIndex(innings);
    const battingTeam = match.teams[battingTeamIndex];
    if (!battingTeam || !battingTeam.name) return [];

    const teamPlayers = getTeamPlayers(battingTeam._id);
    const playing11 = getPlaying11(battingTeam._id);
    const battedPlayerIds = scores
      .filter((score) => score.innings === innings)
      .map((score) => getPlayerId(score.batsman))
      .filter((id) => id);

    let yetToBatPlayers = [];
    if (playing11.length > 0) {
      yetToBatPlayers = playing11
        .filter((playerId) => !battedPlayerIds.includes(playerId))
        .map((playerId) => ({
          _id: playerId,
          name: getPlayerName(playerId),
          team: battingTeam._id,
        }));
    } else {
      yetToBatPlayers = teamPlayers
        .filter((player) => !battedPlayerIds.includes(player._id))
        .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
        .slice(0, 11); // Limit to 11 players
    }

    return yetToBatPlayers;
  };

  const fallOfWickets = (innings) => {
    return scores
      .filter((score) => score?.wicket && score?.outBatsman && score.innings === innings)
      .map((score) => {
        const totalRuns = scores
          .filter((s) => s.innings === score.innings && s.timestamp <= score.timestamp)
          .reduce((sum, s) => sum + (s.runs || 0), 0);
        const legalBalls = scores
          .filter((s) => s.innings === score.innings && s.ballType === "legal" && s.timestamp <= score.timestamp)
          .length;
        const overs = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;

        return {
          player: getPlayerName(score.outBatsman),
          playerId: getPlayerId(score.outBatsman),
          runs: totalRuns,
          overs: overs.toFixed(1),
          wicketNumber: scores.filter((s) => s.innings === score.innings && s.wicket && s.timestamp <= score.timestamp).length,
        };
      });
  };

  const calculatePartnerships = (innings) => {
    const partnerships = [];
    const inningsScores = scores.filter((score) => score.innings === innings).sort((a, b) => a.timestamp - b.timestamp);
    let currentBatsmen = [];
    let partnershipRuns = 0;
    let partnershipBalls = 0;

    inningsScores.forEach((score, index) => {
      const batsmanId = getPlayerId(score.batsman);

      if (currentBatsmen.length < 2 && batsmanId && !currentBatsmen.includes(batsmanId)) {
        currentBatsmen.push(batsmanId);
      }

      if (currentBatsmen.length === 2) {
        partnershipRuns += score.runs || 0;
        if (score.ballType === "legal") partnershipBalls += 1;
      }

      if (score.wicket && score.outBatsman) {
        const outBatsmanId = getPlayerId(score.outBatsman);
        if (currentBatsmen.includes(outBatsmanId) && currentBatsmen.length === 2) {
          partnerships.push({
            batsmen: [...currentBatsmen],
            runs: partnershipRuns,
            balls: partnershipBalls,
          });

          currentBatsmen = currentBatsmen.filter((id) => id !== outBatsmanId);
          partnershipRuns = 0;
          partnershipBalls = 0;

          const nextScore = inningsScores.slice(index + 1).find((s) => s.batsman && !currentBatsmen.includes(getPlayerId(s.batsman)));
          if (nextScore) {
            const nextBatsmanId = getPlayerId(nextScore.batsman);
            if (nextBatsmanId) currentBatsmen.push(nextBatsmanId);
          }
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

  const handleTeamClick = (teamIndex) => setSelectedTeam(teamIndex);
  const handlePlayingTeamClick = (teamIndex) => setSelectedPlayingTeam(teamIndex);
  const handleTabClick = (tab) => setActiveTab(tab);

  const getInningsForTeam = (teamIndex) => {
    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;
    if (tossWinnerIndex === -1) return [teamIndex + 1];
    if (match.format === "Test") {
      return teamIndex === tossWinnerIndex && match.tossChoice === "bat" ? [1, 3] : teamIndex === otherTeamIndex && match.tossChoice === "bowl" ? [1, 3] : [2, 4];
    }
    return teamIndex === tossWinnerIndex && match.tossChoice === "bat" ? [1] : teamIndex === otherTeamIndex && match.tossChoice === "bowl" ? [1] : [2];
  };

  const getTossUpdate = () => {
    const tossWinnerTeam = match.teams.find((team) => team._id === match.tossWinner);
    return `${tossWinnerTeam?.name || "Unknown Team"} won the toss and chose to ${match.tossChoice === "bat" ? "bat" : "bowl"}`;
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
  };

  const getTeamForm = (teamMatches, teamId) => {
    return teamMatches.map((match) => (!match.winner ? "L" : match.winner._id.toString() === teamId.toString() ? "W" : "L"));
  };

  const getWinningMargin = () => {
    if (!match.winner || !match.runsScored || !match.wickets) return null;
    const winnerId = getPlayerId(match.winner);
    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;
    const firstBattingTeamIndex = tossWinnerIndex === -1 ? 0 : match.tossChoice === "bat" ? tossWinnerIndex : otherTeamIndex;
    const secondBattingTeamIndex = firstBattingTeamIndex === 0 ? 1 : 0;
    const winnerIndex = match.teams.findIndex((team) => team._id === winnerId);

    if (winnerIndex === firstBattingTeamIndex) {
      const runsMargin = (match.runsScored.innings1 || 0) - (match.runsScored.innings2 || 0);
      return `${match.teams[winnerIndex].name} won by ${runsMargin} runs`;
    } else if (winnerIndex === secondBattingTeamIndex) {
      const wicketsRemaining = 10 - (match.wickets.innings2 || 0);
      return `${match.teams[winnerIndex].name} won by ${wicketsRemaining} wickets`;
    }
    return null;
  };

  const getTotalOversPerInning = () => {
    if (match.totalOvers) return match.totalOvers;
    switch (match.format?.toLowerCase()) {
      case "t20": return 20;
      case "odi": return 50;
      case "test": return 90;
      default: return 50;
    }
  };

  const calculateRunRateAndProjections = (innings) => {
    const inningsStats = calculateInningsStats(innings);
    const ballsBowled = inningsStats.balls || 0;
    const runsScored = inningsStats.runs || 0;
    const oversBowled = inningsStats.overs || 0;
    const totalOvers = getTotalOversPerInning();

    const currentRunRate = ballsBowled > 0 ? (runsScored / (ballsBowled / 6)).toFixed(2) : 0;
    const runRates = [
      parseFloat(currentRunRate),
      parseFloat(currentRunRate) - 0.5 > 0 ? (parseFloat(currentRunRate) - 0.5).toFixed(2) : 0,
      (parseFloat(currentRunRate) + 0.5).toFixed(2),
      (parseFloat(currentRunRate) + 1.0).toFixed(2),
    ];

    const remainingOvers = totalOvers - oversBowled;
    const projectionPoints = [];
    if (remainingOvers > 5) projectionPoints.push(Math.round(oversBowled + remainingOvers * 0.25));
    if (remainingOvers > 10) projectionPoints.push(Math.round(oversBowled + remainingOvers * 0.5));
    if (remainingOvers > 15) projectionPoints.push(Math.round(oversBowled + remainingOvers * 0.75));
    projectionPoints.push(totalOvers);

    const projections = {};
    projectionPoints.forEach((overs) => {
      projections[overs] = runRates.map((rr) => {
        const additionalOvers = overs - oversBowled;
        return oversBowled <= overs ? Math.round(runsScored + rr * additionalOvers) : runsScored;
      });
    });

    return { currentRunRate, projections, runRates, projectionPoints };
  };

  const calculateWinProbability = (innings) => {
    const inningsStats = calculateInningsStats(innings);
    const runsScored = inningsStats.runs || 0;
    const wickets = inningsStats.wickets || 0;
    const oversBowled = inningsStats.overs || 0;
    const totalOvers = getTotalOversPerInning();
    const remainingOvers = totalOvers - oversBowled;
    const remainingWickets = 10 - wickets;
    const target = match.target || (innings === 1 ? 200 : calculateInningsStats(1).runs + 1);
    const runsNeeded = target - runsScored;
    const requiredRunRate = remainingOvers > 0 ? runsNeeded / remainingOvers : 0;
    const currentRunRate = oversBowled > 0 ? runsScored / oversBowled : 0;

    let battingTeamProbability = 50;
    if (remainingOvers > 0 && requiredRunRate >= 0) {
      const runRateFactor = (currentRunRate - requiredRunRate) * 5;
      const wicketFactor = remainingWickets * 3;
      const oversFactor = (remainingOvers / totalOvers) * 20;
      battingTeamProbability = Math.min(100, Math.max(0, 50 + runRateFactor + wicketFactor - oversFactor));
    }
    return { battingTeam: Math.round(battingTeamProbability), bowlingTeam: Math.round(100 - battingTeamProbability) };
  };

  const getPlayerOfTheMatch = () => {
    const allStats = [1, 2].map((i) => calculateInningsStats(i));
    let bestPlayer = { id: null, score: 0 };

    allStats.forEach((stats) => {
      Object.entries(stats.batting).forEach(([playerId, stat]) => {
        const battingScore = stat.runs * 1 + (stat.runsBreakdown[4] || 0) * 2 + (stat.runsBreakdown[6] || 0) * 3;
        if (battingScore > bestPlayer.score) bestPlayer = { id: playerId, score: battingScore };
      });

      Object.entries(stats.bowling).forEach(([playerId, stat]) => {
        const bowlingScore = stat.wickets * 25 - stat.runs * 0.5;
        if (bowlingScore > bestPlayer.score) bestPlayer = { id: playerId, score: bowlingScore };
      });
    });

    return players.find((p) => p._id === bestPlayer.id);
  };

  const getCurrentInning = () => scores.some((score) => score.innings === 2) ? 2 : 1;

  const getLatestBowlerOver = (inning, bowlerId) => {
    const bowlerScores = scores
      .filter((score) => score.innings === inning && (score.bowler === bowlerId || score.bowler?._id === bowlerId))
      .sort((a, b) => (b.over || 0) - (a.over || 0));
    return bowlerScores.length > 0 ? bowlerScores[0].over : null;
  };

  const getBowlerOverStats = (inning, over, bowlerId) => {
    const overScores = scores.filter(
      (score) => score.innings === inning && score.over === over && (score.bowler === bowlerId || score.bowler?._id === bowlerId)
    );
    const runs = overScores.reduce((sum, score) => sum + (score.runs || 0), 0);
    const wickets = overScores.filter((score) => score.wicket && score.wicketType !== "run out").length;
    const legalBalls = overScores.filter((score) => score.ballType === "legal").length;
    return `${wickets}-${runs}(${legalBalls > 0 ? (legalBalls / 6).toFixed(1) : "0.0"})`;
  };

  return (
    <div className="d-flex flex-column min-vh-100 match-details-container" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
      <Header />
      <div className="container py-4">
        <nav className="navbar navbar-expand-lg mb-4">
          <div className="container-fluid">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button className={`nav-link ${activeTab === "Match info" ? "active" : ""}`} onClick={() => handleTabClick("Match info")}>
                  Match info
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === "Live" ? "active" : ""}`} onClick={() => handleTabClick("Live")}>
                  Live
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${activeTab === "Scorecard" ? "active" : ""}`} onClick={() => handleTabClick("Scorecard")}>
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
                              <tr className="table-dark">
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
                                    <tr key={playerId} className="table-light">
                                      <td>
                                        <Link to={`/player/${playerId}`} style={{ color: "var(--text-muted)" }}>
                                          {playerName} {isCurrent ? "*" : ""}
                                        </Link>
                                      </td>
                                      <td>{dismissal || "NOT OUT"}</td>
                                      <td>{stats.runs || 0}</td>
                                      <td>{stats.balls || 0}</td>
                                      <td>{stats.runsBreakdown?.[4] || 0}</td>
                                      <td>{stats.runsBreakdown?.[6] || 0}</td>
                                      <td>{stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(2) : "0.00"}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr className="table-dark">
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
                              <tr className="table-dark">
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
                                  const overs = stats.balls > 0 ? (Math.floor(stats.balls / 6) + (stats.balls % 6) / 10).toFixed(1) : "0.0";
                                  const maidens = scores
                                    .filter((s) => s.innings === inning && s.bowler === playerId && s.ballType === "legal")
                                    .reduce((acc, curr, idx, arr) => {
                                      const overStart = Math.floor(idx / 6) * 6;
                                      const overScores = arr.slice(overStart, overStart + 6);
                                      return overScores.length === 6 && overScores.every((s) => s.runs === 0) ? acc + 1 : acc;
                                    }, 0);

                                  return (
                                    <tr key={playerId}>
                                      <td>
                                        <Link to={`/player/${playerId}`} style={{ color: "var(--text-muted)" }}>
                                          {playerName} {isCurrent ? "*" : ""}
                                        </Link>
                                      </td>
                                      <td>{overs}</td>
                                      <td>{maidens}</td>
                                      <td>{stats.runs || 0}</td>
                                      <td>{stats.wickets || 0}</td>
                                      <td>{stats.balls > 0 ? (stats.runs / (stats.balls / 6)).toFixed(2) : "0.00"}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr className="table-dark">
                                  <td colSpan="6">No bowling data available</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        <h3 className="h6 mt-3">Extras</h3>
                        <p className="small">
                          {extras.total || 0} (b {extras.byes || 0}, lb {extras.legByes || 0}, w {extras.wides || 0}, nb {extras.noBalls || 0}, p 0)
                        </p>

                        <h3 className="h6 mt-3">Fall of Wickets</h3>
                        {fallOfWickets(inning).length > 0 ? (
                          <table className="table table-bordered table-sm match-table">
                            <thead>
                              <tr className="table-dark">
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
                                  <td>
                                    <Link to={`/player/${fow.playerId}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                                      {fow.player}
                                    </Link>
                                  </td>
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
                              <tr className="table-dark">
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
                                    <Link to={`/player/${partnership.batsmen[0]}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                                      {getPlayerName(partnership.batsmen[0])}
                                    </Link>{" "}
                                    &{" "}
                                    <Link to={`/player/${partnership.batsmen[1]}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                                      {getPlayerName(partnership.batsmen[1])}
                                    </Link>
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
                    <div className="card-footer" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                      <p className="small fw-bold">Winner: {match.winner?.name || "TBD"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {selectedTeam !== null && (
              <div className="yet-to-bat-container" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                <h2 className="h5 mb-3">Yet to bat</h2>
                <div className="d-flex flex-wrap justify-content-between">
                  {getInningsForTeam(selectedTeam).flatMap((inning) =>
                    yetToBat(inning).length > 0 ? (
                      yetToBat(inning).map((player, index) => (
                        <div key={`${inning}-${index}`} className="player-avatar d-flex flex-column align-items-center mb-3">
                          <FaUserCircle size={40} className="text-muted" />
                          <p className="small mb-0 text-center">
                            <Link to={`/player/${player._id}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                              {player.name || "Unknown Player"}
                            </Link>
                          </p>
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
          <div className="match-info-container d-flex flex-row" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
            <div className="match-details-container flex-grow-1 me-4" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
              <div className="match-header mb-4" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
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
                    <p className="match-result mt-2" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                      {getWinningMargin() || "Winner declared, but margin not available"}
                    </p>
                  )}
                </div>
              </div>

              <div className="team-form mb-4" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                <h3>Team Form (Last 5 matches)</h3>
                <div className="team-form-row d-flex align-items-center mb-3">
                  <div className="team-info d-flex align-items-center me-3">
                    <span className={`flag flag-${match.teams[0].name.toLowerCase()}`} />
                    <span className="team-name ms-2">{match.teams[0].name}</span>
                  </div>
                  {getTeamForm(teamForm.team1, match.teams[0]._id).map((result, index) => (
                    <span key={index} className={`form-badge ${result === "W" ? "bg-success" : "bg-danger"} me-1`}>
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
                    <span key={index} className={`form-badge ${result === "W" ? "bg-success" : "bg-danger"} me-1`}>
                      {result}
                    </span>
                  ))}
                </div>
              </div>

              <div className="head-to-head" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                <h3 className="">Head to Head (Last 10 matches)</h3>
                <div className="d-flex align-items-center justify-content-between">
                  <span className="team-name">{match.teams[0].name}</span>
                  <span className="match-score">{headToHead.team1Wins} - {headToHead.team2Wins}</span>
                  <span className="team-name">{match.teams[1].name}</span>
                </div>
              </div>
            </div>

            <div className="playing-xi-container" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
              <h3 className="">Squad</h3>
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
                {(() => {
                  const teamId = match.teams[selectedPlayingTeam]._id;
                  const playing11 = getPlaying11(teamId);
                  const teamPlayers = getTeamPlayers(teamId);

                  const getPlayersWhoPlayed = () => {
                    const playerIds = new Set();
                    scores.forEach((score) => {
                      if (score.batsman && teamPlayers.some((p) => p._id === getPlayerId(score.batsman))) {
                        playerIds.add(getPlayerId(score.batsman));
                      }
                      if (score.bowler && teamPlayers.some((p) => p._id === getPlayerId(score.bowler))) {
                        playerIds.add(getPlayerId(score.bowler));
                      }
                      if (score.fielder && teamPlayers.some((p) => p._id === getPlayerId(score.fielder))) {
                        playerIds.add(getPlayerId(score.fielder));
                      }
                    });
                    return teamPlayers.filter((player) => playerIds.has(player._id));
                  };

                  if (playing11.length > 0) {
                    return playing11.map((playerId, index) => (
                      <div key={index} className="player-item d-flex align-items-center mb-2">
                        <FaUserCircle className="me-2 text-muted" style={{ fontSize: "24px" }} />
                        <span className="player-name">
                          <Link to={`/player/${playerId}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                            {getPlayerName(playerId)}
                          </Link>
                        </span>
                        <span className="player-role ms-2 text-muted small">
                          {players.find((p) => p._id === playerId)?.role || "All Rounder"}
                        </span>
                      </div>
                    ));
                  }

                  if (["Completed", "Ongoing"].includes(match.status)) {
                    const playersWhoPlayed = getPlayersWhoPlayed();
                    if (playersWhoPlayed.length > 0) {
                      return playersWhoPlayed.map((player, index) => (
                        <div key={index} className="player-item d-flex align-items-center mb-2">
                          <FaUserCircle className="me-2 text-muted" style={{ fontSize: "24px" }} />
                          <span className="player-name">
                            <Link to={`/player/${player._id}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                              {player.name}
                            </Link>
                          </span>
                          <span className="player-role ms-2 text-muted small">{player.role || "All Rounder"}</span>
                        </div>
                      ));
                    }
                    return <p className="text-muted small">No players recorded as having played yet.</p>;
                  }

                  if (match.status === "Scheduled") {
                    const sortedTeamPlayers = [...teamPlayers].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 11);
                    return sortedTeamPlayers.map((player, index) => (
                      <div key={index} className="player-item d-flex align-items-center mb-2">
                        <FaUserCircle className="me-2 text-muted" style={{ fontSize: "24px" }} />
                        <span className="player-name">
                          <Link to={`/player/${player._id}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                            {player.name}
                          </Link>
                        </span>
                        <span className="player-role ms-2 text-muted small">{player.role || "All Rounder"}</span>
                        </div>
                    ));
                  }

                  return <p className="text-muted small">No players available for this team.</p>;
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Live" && (
          <div className="live-section d-flex flex-row">
            <div className="live-players-container flex-grow-1 me-4" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
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
                    (score) => score.innings === inning && (score.batsman === playerId || score.batsman?._id === playerId)
                  );
                  const runs = playerScores.reduce((sum, score) => sum + (score.runs || 0), 0);
                  const balls = playerScores.filter((score) => score.ballType === "legal").length;
                  return { runs, balls };
                };

                const getBowlerStatsForMatch = (bowlerId, over) => {
                  const overScores = scores.filter(
                    (score) => score.innings === inning && score.over === over && (score.bowler === bowlerId || score.bowler?._id === bowlerId)
                  );
                  const runs = overScores.reduce((sum, score) => sum + (score.runs || 0), 0);
                  const wickets = overScores.filter((score) => score.wicket && score.wicketType !== "run out").length;
                  const legalBalls = overScores.filter((score) => score.ballType === "legal").length;
                  return `${wickets}-${runs} (${legalBalls > 0 ? `${Math.floor(legalBalls / 6)}.${legalBalls % 6}` : "0.0"})`;
                };

                const strikerStats = match.currentBatsmen?.[0] ? getPlayerStatsForMatch(getPlayerId(match.currentBatsmen[0])) : { runs: 0, balls: 0 };
                const nonStrikerStats = match.currentBatsmen?.[1] ? getPlayerStatsForMatch(getPlayerId(match.currentBatsmen[1])) : { runs: 0, balls: 0 };
                const bowlerStats = match.currentBowler && latestBowlerOver !== null ? getBowlerStatsForMatch(bowlerId, latestBowlerOver) : "0-0 (0.0)";

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
                          <div className="player-card text-center" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                            <FaUserCircle size={40} className="text-muted mb-2" />
                            <p className="player-name mb-1">
                              <Link to={`/player/${getPlayerId(match.currentBatsmen[0])}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                                {getPlayerName(match.currentBatsmen[0])}
                              </Link>
                            </p>
                            <p style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>{strikerStats.runs}({strikerStats.balls})</p>
                          </div>
                          <div className="player-card text-center" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                            <FaUserCircle size={40} className="text-muted mb-2" />
                            <p className="player-name mb-1">
                              <Link to={`/player/${getPlayerId(match.currentBatsmen[1])}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                                {getPlayerName(match.currentBatsmen[1])}
                              </Link>
                            </p>
                            <p style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>{nonStrikerStats.runs}({nonStrikerStats.balls})</p>
                          </div>
                        </>
                      ) : (
                        <p className="text-muted small">No current batsmen available</p>
                      )}
                      {match.currentBowler && latestBowlerOver !== null ? (
                        <div className="player-card text-center" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                          <FaUserCircle size={40} className="text-muted mb-2" />
                          <p className="player-name mb-1">
                            <Link to={`/player/${bowlerId}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                              {getPlayerName(match.currentBowler)}
                            </Link>
                          </p>
                          <p style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>{bowlerStats}</p>
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
                                  className={`over-ball ${score.wicket ? "bg-danger" : score.runs === 0 ? "bg-dark" : "bg-success"}`}
                                >
                                  {score.wicket ? "W" : score.runs || "0"}
                                </span>
                              ))}
                            {Array.from({ length: 6 - scores.filter((score) => score.innings === inning && score.over === latestBowlerOver).length }).map((_, index) => (
                              <span key={`empty-${index}`} className="over-ball bg-light border border-dark"></span>
                            ))}
                            <span className="over-total ms-2" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                              = {scores.filter((score) => score.innings === inning && score.over === latestBowlerOver).reduce((sum, score) => sum + (score.runs || 0), 0)}
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

            <div className="predictor-container" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
              {(() => {
                const inning = getCurrentInning();
                const battingTeamIndex = getBattingTeamIndex(inning);
                const bowlingTeamIndex = battingTeamIndex === 0 ? 1 : 0;
                const battingTeam = match.teams[battingTeamIndex];
                const bowlingTeam = match.teams[bowlingTeamIndex];

                if (match.status === "Completed") {
                  const playerOfMatch = getPlayerOfTheMatch();
                  const stats = [1, 2].map((i) => calculateInningsStats(i));
                  const battingStats = playerOfMatch ? stats.flatMap((s) => Object.entries(s.batting)).find(([id]) => id === playerOfMatch._id)?.[1] : null;
                  const bowlingStats = playerOfMatch ? stats.flatMap((s) => Object.entries(s.bowling)).find(([id]) => id === playerOfMatch._id)?.[1] : null;

                  return (
                    <div>
                      <h3 className="">Player of the Match</h3>
                      {playerOfMatch ? (
                        <div className="player-card text-center" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                          <FaUserCircle size={60} className="text-muted mb-2" />
                          <p className="player-name mb-1">
                            <Link to={`/player/${playerOfMatch._id}`} style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                              {playerOfMatch.name}
                            </Link>
                          </p>
                          {battingStats && (
                            <p className="small">Batting: {battingStats.runs} runs ({battingStats.balls} balls)</p>
                          )}
                          {bowlingStats && (
                            <p className="small">Bowling: {bowlingStats.wickets}-{bowlingStats.runs} ({(bowlingStats.balls / 6).toFixed(1)} overs)</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted small">No player stats available</p>
                      )}
                    </div>
                  );
                }

                const { currentRunRate, projections, runRates, projectionPoints } = calculateRunRateAndProjections(inning);
                const winProbability = calculateWinProbability(inning);

                return (
                  <div key={inning}>
                    <div className="probability-section mb-4" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                      <h3 className="">Win Probability</h3>
                      <p className="small mb-2">Match Status: {match.status}</p>
                      {match.status === "Ongoing" && (
                        <>
                          <div className="d-flex justify-content-between mb-2">
                            <span>{battingTeam.name.toUpperCase()}</span>
                            <span>{bowlingTeam.name.toUpperCase()}</span>
                          </div>
                          <div className="probability-bar">
                            <div className="probability-fill batting-team" style={{ width: `${winProbability.battingTeam}%` }}></div>
                            <div className="probability-fill bowling-team" style={{ width: `${winProbability.bowlingTeam}%` }}></div>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>{winProbability.battingTeam}%</span>
                            <span>{winProbability.bowlingTeam}%</span>
                          </div>
                        </>
                      )}
                      {["Stopped", "Scheduled"].includes(match.status) && (
                        <p className="text-muted small">Win probability not available for {match.status} matches</p>
                      )}
                    </div>

                    {match.status === "Ongoing" && (
                      <div className="projected-score-section" style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>
                        <h3 className="">Projected Score as per RR</h3>
                        {projectionPoints.length > 0 ? (
                          <table className="projected-score-table">
                            <thead>
                              <tr>
                                <th style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}>Overs</th>
                                {runRates.map((rr, index) => (
                                  <th style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }} key={index}>{rr}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {projectionPoints.map((overs) => (
                                <tr key={overs}>
                                  <td>{overs}</td>
                                  {projections[overs].map((score, index) => (
                                    <td key={index}>{score}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <p className="text-muted small">Match has completed all overs for this inning.</p>
                        )}
                      </div>
                    )}
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