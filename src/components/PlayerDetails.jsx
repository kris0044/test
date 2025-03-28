import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.min.css";
import "../index.css"; // Your global styles
import { FaUserCircle, FaCalendarAlt, FaTrophy } from "react-icons/fa";
import { motion } from "framer-motion";
import ReactPaginate from "react-paginate";
import api from "../utility/axiosInterceptor.js";
import Header from "./Header";

const socket = io(api.defaults.baseURL);

function PlayerDetails() {
  const { playerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [matchFilter, setMatchFilter] = useState({ tournament: "All", team: "All", venue: "All" });
  const [statsFilter, setStatsFilter] = useState({ tournament: "All", team: "All", venue: "All" });
  const [currentPage, setCurrentPage] = useState(0);
  const matchesPerPage = 5;

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/api/players/full/${playerId}`);
        setData(response.data);
      } catch (error) {
        console.error("Error fetching player details:", error);
        setError(error.response?.data?.message || error.message || "Failed to fetch player details");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerDetails();

    socket.on("playerUpdate", (updatedPlayer) => {
      if (updatedPlayer._id === playerId) {
        setData((prev) => ({ ...prev, player: updatedPlayer }));
      }
    });

    return () => socket.off("playerUpdate");
  }, [playerId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const calculateBattingStats = (batting) => {
    const { runs = 0, balls = 0, innings = 0 } = batting;
    const average = innings > 0 ? (runs / innings).toFixed(2) : "0.00";
    const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00";
    return { ...batting, average, strikeRate };
  };

  const calculateBowlingStats = (bowling) => {
    const { runs = 0, balls = 0, wickets = 0 } = bowling;
    const overs = balls > 0 ? (balls / 6).toFixed(1) : "0.0";
    const economy = balls > 0 ? (runs / (balls / 6)).toFixed(2) : "0.00";
    const average = wickets > 0 ? (runs / wickets).toFixed(2) : "0.00";
    return { ...bowling, overs, economy, average };
  };

  const filterMatches = (matches) => {
    return matches.filter((match) => {
      const tournamentMatch = matchFilter.tournament === "All" || match.tournament?.name === matchFilter.tournament;
      const teamMatch =
        matchFilter.team === "All" ||
        match.teams.some((t) => t.name === matchFilter.team && t.name !== data?.player.team?.name);
      const venueMatch = matchFilter.venue === "All" || match.venue?.name === matchFilter.venue;
      return tournamentMatch && teamMatch && venueMatch;
    });
  };

  const filterStats = (matches, scores) => {
    const filteredMatches = matches.filter((match) => {
      const tournamentMatch = statsFilter.tournament === "All" || match.tournament?.name === statsFilter.tournament;
      const teamMatch =
        statsFilter.team === "All" ||
        match.teams.some((t) => t.name === statsFilter.team && t.name !== data?.player.team?.name);
      const venueMatch = statsFilter.venue === "All" || match.venue?.name === statsFilter.venue;
      return tournamentMatch && teamMatch && venueMatch;
    });

    const matchIds = filteredMatches.map((m) => m.id.toString());
    const filteredScores = scores.filter((s) => matchIds.includes(s.matchId.toString()));

    let battingStats = { runs: 0, balls: 0, innings: 0, highest: 0, fifties: 0, hundreds: 0, dismissals: 0 };
    let bowlingStats = { runs: 0, balls: 0, wickets: 0, best: "0/0", fiveWickets: 0 };

    filteredMatches.forEach((match) => {
      if (match.matchStats instanceof Map) {
        ["innings1", "innings2"].forEach((inning) => {
          const inningsStats = match.matchStats.get(inning) || {};
          const batting = inningsStats.batting || {};
          const bowling = inningsStats.bowling || {};

          if (batting[playerId]) {
            const stats = batting[playerId];
            battingStats.runs += stats.runs || 0;
            battingStats.balls += stats.balls || 0;
            battingStats.innings += 1;
            battingStats.highest = Math.max(battingStats.highest, stats.runs || 0);
            if (stats.runs >= 50 && stats.runs < 100) battingStats.fifties += 1;
            if (stats.runs >= 100) battingStats.hundreds += 1;
          }

          if (bowling[playerId]) {
            const stats = bowling[playerId];
            bowlingStats.runs += stats.runs || 0;
            bowlingStats.balls += stats.balls || 0;
            bowlingStats.wickets += stats.wickets || 0;
            const bestWickets = stats.wickets || 0;
            const bestRuns = stats.runs || 0;
            const currentBest = bowlingStats.best.split("/").map(Number);
            if (bestWickets > currentBest[0] || (bestWickets === currentBest[0] && bestRuns < currentBest[1])) {
              bowlingStats.best = `${bestWickets}/${bestRuns}`;
            }
            if (stats.wickets >= 5) bowlingStats.fiveWickets += 1;
          }
        });
      }
    });

    filteredScores.forEach((score) => {
      if (score.batsman?._id.toString() === playerId && score.ballType === "legal") {
        battingStats.runs += score.runs || 0;
        battingStats.balls += 1;
      }
      if (score.bowler?._id.toString() === playerId) {
        bowlingStats.runs += score.runs || 0;
        if (score.ballType === "legal") {
          bowlingStats.balls += 1;
          if (score.wicket) bowlingStats.wickets += 1;
        }
      }
      if (score.outBatsman?._id.toString() === playerId) {
        battingStats.dismissals += 1;
      }
    });

    return { batting: battingStats, bowling: bowlingStats };
  };

  const getTeamTournaments = (matches, scores) => {
    const teamTournaments = {};
    
    matches.forEach((match) => {
      const playerTeam = data?.player.team?.name || "Unknown";
      const tournament = match.tournament?.name || "Unknown";
      if (!teamTournaments[playerTeam]) {
        teamTournaments[playerTeam] = new Set();
      }
      teamTournaments[playerTeam].add(tournament);
    });

    scores.forEach((score) => {
      const match = matches.find((m) => m.id.toString() === score.matchId.toString());
      if (!match) return;

      let playerTeam = "Unknown";
      if (score.batsman?._id.toString() === playerId || score.bowler?._id.toString() === playerId) {
        const opposingTeam = score.bowler?._id.toString() === playerId
          ? match.teams.find((t) => t.name !== data?.player.team?.name)?.name
          : score.batsman?._id.toString() === playerId
          ? match.teams.find((t) => t.name !== data?.player.team?.name)?.name
          : null;
        playerTeam = match.teams.find((t) => t.name !== opposingTeam)?.name || data?.player.team?.name || "Unknown";
      }

      const tournament = match.tournament?.name || "Unknown";
      if (!teamTournaments[playerTeam]) {
        teamTournaments[playerTeam] = new Set();
      }
      teamTournaments[playerTeam].add(tournament);
    });

    return Object.entries(teamTournaments)
      .filter(([team]) => team !== "Unknown" || Object.keys(teamTournaments).length === 1)
      .map(([team, tournaments]) => ({
        team,
        tournaments: Array.from(tournaments),
      }));
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="spinner-border text-primary"
          role="status"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 text-danger fs-4">
        Error: {error}
      </div>
    );
  }

  if (!data?.player) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100 text-muted fs-4">
        Player not found
      </div>
    );
  }

  const { player, matches, scores } = data;
  const filteredMatches = filterMatches(matches);
  const filteredStats = filterStats(matches, scores);
  const battingStats = calculateBattingStats(filteredStats.batting);
  const bowlingStats = calculateBowlingStats(filteredStats.bowling);

  const tournaments = ["All", ...new Set(matches.map((m) => m.tournament?.name).filter(Boolean))];
  const teams = [
    "All",
    ...new Set(
      matches
        .flatMap((m) => m.teams.map((t) => t.name))
        .filter((name) => name !== player.team?.name)
    ),
  ];
  const venues = ["All", ...new Set(matches.map((m) => m.venue?.name).filter(Boolean))];
  const teamTournaments = getTeamTournaments(matches, scores);

  const pageCount = Math.ceil(filteredMatches.length / matchesPerPage);
  const offset = currentPage * matchesPerPage;
  const currentMatches = filteredMatches.slice(offset, offset + matchesPerPage);

  const handlePageClick = (event) => {
    setCurrentPage(event.selected);
  };

  return (
    <div className="min-vh-100" style={{ backgroundColor: "var(--body-bg)" }}>
      <Header />
      <div className="container py-4">
        {/* Player Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card shadow mb-4"
          style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
        >
          <div className="card-body d-flex align-items-center flex-wrap">
            <FaUserCircle size={60} className="me-3" style={{ color: "var(--text-color)" }} />
            <div>
              <h1 className="card-title h3 mb-1" style={{ color: "var(--text-color)" }}>
                {player.name || "Unknown Player"}
              </h1>
              <p className="card-text small text-muted">
                {player.team?.name || "Team TBD"} | {player.role || "N/A"}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <ul className="nav nav-tabs mb-4">
          {["Overview", "Matches", "Statistics"].map((tab) => (
            <li key={tab} className="nav-item">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`nav-link ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
                style={{ color: activeTab === tab ? "#007bff" : "var(--muted-text)" }}
              >
                {tab}
              </motion.button>
            </li>
          ))}
        </ul>

        {/* Overview Tab */}
        {activeTab === "Overview" && (
          <div className="row">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="col-md-8 mb-4"
            >
              <div className="card shadow">
                <div className="card-body">
                  <h2 className="card-title h5 mb-3 d-flex align-items-center">
                    <FaUserCircle className="me-2 text-primary" /> Player Information
                  </h2>
                  <div className="row">
                    <div className="col-md-6">
                      <p><strong>Team:</strong> {player.team?.name || "N/A"}</p>
                      <p><strong>Role:</strong> {player.role || "N/A"}</p>
                      <p><strong>Created At:</strong> {formatDate(player.createdAt)}</p>
                    </div>
                    <div className="col-md-6">
                      <p><strong>Matches Played:</strong> {matches.length || 0}</p>
                      <p><strong>Tournaments Played:</strong> {tournaments.length - 1}</p>
                      <p><strong>Teams Played For:</strong> {teamTournaments.length}</p>
                    </div>
                  </div>
                  <h3 className="h6 mt-3">Team and Tournament Details</h3>
                  <ul className="list-group list-group-flush">
                    {teamTournaments.map(({ team, tournaments }, index) => (
                      <li key={index} className="list-group-item" style={{ backgroundColor: "var(--card-bg)" }}>
                        <strong>{team}:</strong> {tournaments.join(", ")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="col-md-4 mb-4"
            >
              <div className="card shadow text-center">
                <div className="card-body">
                  <h2 className="card-title h5 mb-3 d-flex align-items-center justify-content-center">
                    <FaTrophy className="me-2 text-warning" /> Quick Stats
                  </h2>
                  <p className="fs-5"><strong>Runs:</strong> {battingStats.runs || 0}</p>
                  <p className="fs-5"><strong>Wickets:</strong> {bowlingStats.wickets || 0}</p>
                  <p className="fs-5"><strong>Matches:</strong> {filteredMatches.length}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === "Matches" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="card shadow"
          >
            <div className="card-body">
              <h2 className="card-title h5 mb-3 d-flex align-items-center">
                <FaCalendarAlt className="me-2 text-primary" /> Recent Matches
              </h2>
              {/* Filters */}
              <div className="row mb-3">
                <div className="col-md-4">
                  <label className="form-label">Tournament</label>
                  <select
                    className="form-select"
                    value={matchFilter.tournament}
                    onChange={(e) => setMatchFilter({ ...matchFilter, tournament: e.target.value })}
                    style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                  >
                    {tournaments.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Opponent Team</label>
                  <select
                    className="form-select"
                    value={matchFilter.team}
                    onChange={(e) => setMatchFilter({ ...matchFilter, team: e.target.value })}
                    style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                  >
                    {teams.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Venue</label>
                  <select
                    className="form-select"
                    value={matchFilter.venue}
                    onChange={(e) => setMatchFilter({ ...matchFilter, venue: e.target.value })}
                    style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                  >
                    {venues.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              {filteredMatches.length > 0 ? (
                <>
                  <div className="table-responsive">
                    <table className="table table-striped table-bordered table-hover">
                      <thead style={{ backgroundColor: "#e9ecef" }}>
                        <tr className="table-dark">
                          <th>Date</th>
                          <th>Match</th>
                          <th>Type</th>
                          <th>Tournament</th>
                          <th>Venue</th>
                          <th>Runs</th>
                          <th>Wickets</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentMatches.map((match) => {
                          const matchScores = scores.filter((s) => s.matchId.toString() === match.id.toString());
                          const runs = matchScores
                            .filter((s) => s.batsman?._id.toString() === playerId && s.ballType === "legal")
                            .reduce((sum, s) => sum + (s.runs || 0), 0);
                          const wickets = matchScores
                            .filter((s) => s.bowler?._id.toString() === playerId && s.wicket)
                            .length;
                          return (
                            <motion.tr
                              key={match.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <td>{formatDate(match.createdAt)}</td>
                              <td>
                                <Link to={`/match/${match.id}`} className="text-primary">
                                  {match.teams.map((t) => t.name).join(" vs ")}
                                </Link>
                              </td>
                              <td>{match.matchType || "N/A"}</td>
                              <td>{match.tournament?.name || "N/A"}</td>
                              <td>{match.venue?.name || "N/A"}</td>
                              <td>{runs}</td>
                              <td>{wickets}</td>
                              <td>
                                {match.status === "Completed" && match.winner
                                  ? `${match.winner.name} won`
                                  : match.status}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ReactPaginate
                    previousLabel={"Previous"}
                    nextLabel={"Next"}
                    breakLabel={"..."}
                    pageCount={pageCount}
                    marginPagesDisplayed={2}
                    pageRangeDisplayed={3}
                    onPageChange={handlePageClick}
                    containerClassName={"pagination justify-content-center mt-3"}
                    pageClassName={"page-item"}
                    pageLinkClassName={"page-link"}
                    previousClassName={"page-item"}
                    previousLinkClassName={"page-link"}
                    nextClassName={"page-item"}
                    nextLinkClassName={"page-link"}
                    breakClassName={"page-item"}
                    breakLinkClassName={"page-link"}
                    activeClassName={"active"}
                    pageLinkStyle={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                    previousLinkStyle={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                    nextLinkStyle={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                    breakLinkStyle={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                  />
                </>
              ) : (
                <p className="text-muted">No matches available for the selected filters.</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Statistics Tab (Unchanged from Original) */}
        {activeTab === "Statistics" && (
          <div>
            {/* Filters */}
            <div className="row mb-4">
              <div className="col-md-4">
                <label className="form-label">Tournament</label>
                <select
                  className="form-select"
                  value={statsFilter.tournament}
                  onChange={(e) => setStatsFilter({ ...statsFilter, tournament: e.target.value })}
                  style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                >
                  {tournaments.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Opponent Team</label>
                <select
                  className="form-select"
                  value={statsFilter.team}
                  onChange={(e) => setStatsFilter({ ...statsFilter, team: e.target.value })}
                  style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                >
                  {teams.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Venue</label>
                <select
                  className="form-select"
                  value={statsFilter.venue}
                  onChange={(e) => setStatsFilter({ ...statsFilter, venue: e.target.value })}
                  style={{ backgroundColor: "var(--card-bg)", color: "var(--text-color)" }}
                >
                  {venues.map((v) => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="col-md-6 mb-4"
              >
                <div className="card shadow">
                  <div className="card-body">
                    <h2 className="card-title h5 mb-3">Batting Statistics</h2>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td><strong>Matches</strong></td><td>{filteredMatches.length}</td></tr>
                        <tr><td><strong>Innings</strong></td><td>{battingStats.innings || 0}</td></tr>
                        <tr><td><strong>Runs</strong></td><td>{battingStats.runs || 0}</td></tr>
                        <tr><td><strong>Average</strong></td><td>{battingStats.average}</td></tr>
                        <tr><td><strong>Strike Rate</strong></td><td>{battingStats.strikeRate}</td></tr>
                        <tr><td><strong>Highest</strong></td><td>{battingStats.highest || 0}</td></tr>
                        <tr><td><strong>50s/100s</strong></td><td>{battingStats.fifties || 0}/{battingStats.hundreds || 0}</td></tr>
                        <tr><td><strong>Dismissals</strong></td><td>{battingStats.dismissals || 0}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="col-md-6 mb-4"
              >
                <div className="card shadow">
                  <div className="card-body">
                    <h2 className="card-title h5 mb-3">Bowling Statistics</h2>
                    <table className="table table-sm">
                      <tbody>
                        <tr><td><strong>Matches</strong></td><td>{filteredMatches.length}</td></tr>
                        <tr><td><strong>Overs</strong></td><td>{bowlingStats.overs}</td></tr>
                        <tr><td><strong>Wickets</strong></td><td>{bowlingStats.wickets || 0}</td></tr>
                        <tr><td><strong>Average</strong></td><td>{bowlingStats.average}</td></tr>
                        <tr><td><strong>Economy</strong></td><td>{bowlingStats.economy}</td></tr>
                        <tr><td><strong>Best</strong></td><td>{bowlingStats.best || "0/0"}</td></tr>
                        <tr><td><strong>5W Hauls</strong></td><td>{bowlingStats.fiveWickets || 0}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerDetails;