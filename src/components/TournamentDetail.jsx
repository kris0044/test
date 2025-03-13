import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import "../index.css";
import api from "../utility/axiosInterceptor.js";
import LoadingSpinner from "./LoadingSpinner";
import { motion } from "framer-motion";

function TournamentDetail() {
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [players, setPlayers] = useState([]);
  const [pointsTable, setPointsTable] = useState([]);
  const [keyPlayers, setKeyPlayers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("matches");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [visibleRows, setVisibleRows] = useState(2); // For matches
  const [visiblePlayers, setVisiblePlayers] = useState({}); // For key players in each card

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tournamentResponse = await api.get(`/api/tournaments/${tournamentId}`);
        setTournament(tournamentResponse.data);
        if (tournamentResponse.data.teams && tournamentResponse.data.teams.length > 0) {
          setSelectedTeam(tournamentResponse.data.teams[0]);
        }

        const playersResponse = await api.get("/api/players");
        setPlayers(playersResponse.data);

        const pointsTableResponse = await api.get(`/api/tournaments/${tournamentId}/points-table`);
        setPointsTable(pointsTableResponse.data);

        const keyPlayersResponse = await api.get(`/api/tournaments/${tournamentId}/key-players`);
        setKeyPlayers(keyPlayersResponse.data);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [tournamentId]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  };

  const formatScore = (runs, overs, wickets) => {
    if (runs && overs) {
      return `${runs}/${wickets || 0} (${overs})`;
    }
    return "N/A";
  };

  const groupPlayersByRole = (teamName) => {
    const teamPlayers = players.filter((player) => player.team === teamName);
    const grouped = {
      Batsman: [],
      Bowler: [],
      "All-Rounder": [],
      Wicketkeeper: [],
    };

    teamPlayers.forEach((player) => {
      if (grouped[player.role]) {
        grouped[player.role].push(player);
      } else {
        grouped["All-Rounder"].push(player);
      }
    });

    return grouped;
  };

  const getAllMatches = () => {
    if (!tournament) return [];
    const leagueMatches = (tournament.matches || []).map(match => ({ ...match, matchType: match.matchType || "League" }));
    const semiFinalMatches = (tournament.semiFinals || []).map(match => ({ ...match, matchType: match.matchType || "Semi-Final" }));
    const finalMatch = tournament.final ? [{ ...tournament.final, matchType: tournament.final.matchType || "Final" }] : [];
    return [...finalMatch, ...semiFinalMatches, ...leagueMatches];
  };

  const chunkMatches = (matches, size) => {
    const chunked = [];
    for (let i = 0; i < matches.length; i += size) {
      chunked.push(matches.slice(i, i + size));
    }
    return chunked;
  };

  const handleLoadMorePlayers = (sectionTitle) => {
    setVisiblePlayers(prev => ({
      ...prev,
      [sectionTitle]: (prev[sectionTitle] || 5) + 5,
    }));
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="d-flex justify-content-center align-items-center min-vh-100"
      >
        <LoadingSpinner size="large" message="Fetching Details..." />
      </motion.div>
    );
  }

  if (!tournament) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-5" 
        style={{ minHeight: "100vh", color: "var(--text)" }}
      >
        Tournament not found.
      </motion.div>
    );
  }

  return (
    <div 
      className="d-flex flex-column min-vh-100" 
      style={{ background: 'linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)' }}
    >
      <Header />
      <div className="container py-5 flex-grow-1">
        {/* Tournament Header */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <h1 className="fw-bold mb-3 display-4" style={{ color: "var(--text)" }}>
            {tournament.name || "Tournament Name"}
          </h1>
          <p className="text-muted fs-5 mb-3">{formatDateRange(tournament.startDate, tournament.endDate)}</p>
          {tournament.winner && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="d-flex align-items-center"
            >
              <span
                className="rounded-circle me-3"
                style={{
                  width: "40px",
                  height: "40px",
                  background: 'linear-gradient(135deg, #ffd700, #ffa500)',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                }}
              ></span>
              <p className="fw-bold mb-0 fs-3" style={{ color: "var(--success)" }}>
                Winner: {tournament.winner.name}
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-5"
        >
          <ul className="nav nav-tabs border-0 d-flex justify-content-start flex-wrap">
            {[
              { id: "matches", label: "Matches" },
              { id: "squads", label: "Squads" },
              { id: "pointsTable", label: "Points Table" },
              { id: "keyPlayers", label: "Key Players" },
            ].map((tab) => (
              <li key={tab.id} className="nav-item me-3 mb-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`nav-link border-0 bg-transparent position-relative ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    color: activeTab === tab.id ? "var(--primary-yellow)" : "var(--text-muted)",
                    padding: "12px 25px",
                    fontWeight: activeTab === tab.id ? "600" : "normal",
                    background: activeTab === tab.id ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                    borderRadius: '8px',
                    transition: "all 0.3s ease",
                  }}
                >
                  {tab.label}
                  <span
                    className="position-absolute"
                    style={{
                      bottom: "0",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: activeTab === tab.id ? "80%" : "0",
                      height: "3px",
                      backgroundColor: "var(--primary-yellow)",
                      borderRadius: "2px",
                      transition: "width 0.3s ease",
                    }}
                  ></span>
                </motion.button>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Tab Content */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="tab-content"
        >
          {activeTab === "matches" && (
            <div className="tab-pane fade show active">
              {getAllMatches().length === 0 ? (
                <p className="text-center text-muted fs-5">No matches available.</p>
              ) : (
                <>
                  {chunkMatches(getAllMatches(), 3).slice(0, visibleRows).map((row, rowIndex) => (
                    <motion.div
                      key={rowIndex}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: rowIndex * 0.2 }}
                      className="d-flex flex-wrap justify-content-between mb-4 gap-3"
                    >
                      {row.map((match) => {
                        const team1 = match.teams && match.teams[0] ? match.teams[0] : { name: "Unknown" };
                        const team2 = match.teams && match.teams[1] ? match.teams[1] : { name: "Unknown" };
                        const team1Score = formatScore(match.runsScored?.innings1, match.oversBowled?.innings1, match.wickets?.innings1);
                        const team2Score = formatScore(match.runsScored?.innings2, match.oversBowled?.innings2, match.wickets?.innings2);
                        const result = match.winner && match.winner.name
                          ? `${match.winner.name} Won`
                          : match.status === "Completed"
                          ? "Match Completed"
                          : "Scheduled";

                        return (
                          <motion.div
                            key={match._id}
                            whileHover={{ scale: 1.03 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            className="flex-grow-1"
                            style={{ flexBasis: '30%', minWidth: '300px' }}
                          >
                            <Link to={`/match/${match._id}`} className="text-decoration-none">
                              <div className="match-card p-4 rounded-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}>
                                <p className="small mb-2 fw-bold" style={{ color: "var(--primary-yellow)" }}>
                                  {match.matchType}
                                </p>
                                <p className="text-muted small mb-3">{formatDate(match.createdAt)}</p>
                                <div className="d-flex justify-content-between align-items-center flex-wrap">
                                  <div className="d-flex align-items-center flex-wrap">
                                    <div className="d-flex align-items-center me-3 mb-2">
                                      <span
                                        className="rounded-circle me-2"
                                        style={{ width: "40px", height: "40px", background: 'linear-gradient(135deg, #007bff, #0056b3)' }}
                                      ></span>
                                      <div>
                                        <h6 className="mb-1 fw-bold" style={{ color: "var(--text)" }}>{team1.name}</h6>
                                        <p className="mb-0 text-muted small">{team1Score}</p>
                                      </div>
                                    </div>
                                    <span className="text-muted fw-bold mx-2 mb-2">VS</span>
                                    <div className="d-flex align-items-center mb-2">
                                      <span
                                        className="rounded-circle me-2"
                                        style={{ width: "40px", height: "40px", background: 'linear-gradient(135deg, #ffd700, #ffa500)' }}
                                      ></span>
                                      <div>
                                        <h6 className="mb-1 fw-bold" style={{ color: "var(--text)" }}>{team2.name}</h6>
                                        <p className="mb-0 text-muted small">{team2Score}</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <p
                                      className="mb-0 fw-bold small"
                                      style={{ color: result.includes("Won") ? "var(--success)" : "var(--warning)" }}
                                    >
                                      {result}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                      {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, idx) => (
                        <div
                          key={`filler-${rowIndex}-${idx}`}
                          className="flex-grow-1 invisible"
                          style={{ flexBasis: '30%', minWidth: '300px' }}
                        ></div>
                      ))}
                    </motion.div>
                  ))}
                  {chunkMatches(getAllMatches(), 3).length > visibleRows && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="text-center mt-5"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="btn btn-outline-primary btn-lg px-5 py-2"
                        onClick={() => setVisibleRows(prev => prev + 2)}
                      >
                        Load More
                      </motion.button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === "squads" && (
            <div className="tab-pane fade show active">
              <div className="row">
                <motion.div 
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="col-md-3 col-lg-2 mb-4"
                >
                  <div className="list-group">
                    {tournament.teams.map((team, index) => (
                      <motion.button
                        key={team._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        className={`list-group-item list-group-item-action mb-2 rounded-3 ${selectedTeam?._id === team._id ? "active" : ""}`}
                        onClick={() => setSelectedTeam(team)}
                        style={{
                          background: selectedTeam?._id === team._id 
                            ? 'linear-gradient(135deg, #ffd700, #ffa500)' 
                            : 'var(--card-bg)',
                          color: selectedTeam?._id === team._id ? "#fff" : "var(--text-muted)",
                          border: "none",
                          padding: "15px",
                          transition: "all 0.3s ease",
                          boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <span
                            className="rounded-circle me-3"
                            style={{
                              width: "35px",
                              height: "35px",
                              background: selectedTeam?._id === team._id ? '#fff' : 'var(--primary-blue)',
                            }}
                          ></span>
                          <div>
                            <span className="fw-bold">{team.name}</span>
                            <p className="mb-0 small">
                              {players.filter((p) => p.team === team.name).length || 0} Players
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="col-md-9 col-lg-10"
                >
                  {selectedTeam ? (
                    <>
                      <div className="d-flex align-items-center mb-4">
                        <span
                          className="rounded-circle me-3"
                          style={{
                            width: "50px",
                            height: "50px",
                            background: 'linear-gradient(135deg, #007bff, #0056b3)',
                          }}
                        ></span>
                        <h3 className="mb-0 fw-bold" style={{ color: "var(--text)" }}>{selectedTeam.name}</h3>
                        <p className="mb-0 ms-3 text-muted fs-5">
                          {players.filter((p) => p.team === selectedTeam.name).length || 0} Players
                        </p>
                      </div>

                      {Object.entries(groupPlayersByRole(selectedTeam.name)).map(([role, players]) => (
                        players.length > 0 && (
                          <motion.div 
                            key={role} 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-5"
                          >
                            <h5 className="mb-4 fw-bold" style={{ color: "var(--primary-yellow)" }}>
                              {role} ({players.length})
                            </h5>
                            <div className="row">
                              {players.map((player, idx) => (
                                <motion.div
                                  key={player._id || player.name}
                                  initial={{ scale: 0.9, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="col-md-4 col-lg-3 mb-3"
                                  whileHover={{ scale: 1.05 }}
                                >
                                  <div className="p-3 rounded-3 shadow-sm text-center" style={{ background: 'var(--card-bg)' }}>
                                    <p className="mb-1 fw-bold" style={{ color: "var(--text)" }}>{player.name}</p>
                                    <p className="mb-0 small text-muted">{player.role}</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )
                      ))}
                    </>
                  ) : (
                    <p className="text-center fs-5" style={{ color: "var(--text-muted)" }}>No team selected.</p>
                  )}
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === "pointsTable" && (
            <div className="tab-pane fade show active">
              {pointsTable.length === 0 ? (
                <p className="text-center text-muted fs-5">No points table data available.</p>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="p-4 rounded-3 shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}
                >
                  <h5 className="mb-4 fw-bold" style={{ color: "var(--primary-yellow)" }}>Points Table</h5>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr style={{ background: 'var(--primary-blue)', color: '#fff' }}>
                          <th scope="col">Team</th>
                          <th scope="col">Matches</th>
                          <th scope="col">Points</th>
                          <th scope="col">NRR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pointsTable.map((entry, index) => (
                          <motion.tr
                            key={entry.teamId || index}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <td className="d-flex align-items-center">
                              <span
                                className="rounded-circle me-3"
                                style={{
                                  width: "35px",
                                  height: "35px",
                                  background: 'linear-gradient(135deg, #007bff, #0056b3)',
                                }}
                              ></span>
                              <span style={{ color: "var(--text)" }}>{entry.team}</span>
                            </td>
                            <td>{entry.matches}</td>
                            <td>{entry.points}</td>
                            <td style={{ color: entry.nrr >= 0 ? "var(--success)" : "var(--warning)" }}>
                              {entry.nrr >= 0 ? `+${entry.nrr}` : entry.nrr}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === "keyPlayers" && (
            <div className="tab-pane fade show active">
              {!keyPlayers ? (
                <p className="text-center text-muted fs-5">Loading key players data...</p>
              ) : (
                <div className="row">
                  {[
                    { title: "Most Runs", data: keyPlayers.topRunScorers, valueKey: "runs", suffix: "runs" },
                    { title: "Most Wickets", data: keyPlayers.topWicketTakers, valueKey: "wickets", suffix: "wickets" },
                    { title: "Most Sixes", data: keyPlayers.topSixes, valueKey: "sixes", suffix: "sixes" },
                    { title: "Most Fours", data: keyPlayers.topFours, valueKey: "fours", suffix: "fours" },
                    { title: "Highest Strike Rate", data: keyPlayers.topStrikeRate, valueKey: "strikeRate", format: (v) => v.toFixed(2) },
                    { title: "Best Economy", data: keyPlayers.bestEconomy, valueKey: "economy", format: (v) => v.toFixed(2) },
                  ].map((section, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="col-md-6 mb-4"
                    >
                      <div className="p-4 rounded-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}>
                        <h5 className="mb-4 fw-bold" style={{ color: "var(--primary-yellow)" }}>{section.title}</h5>
                        {section.data && section.data.length > 0 ? (
                          <>
                            {section.data.slice(0, visiblePlayers[section.title] || 5).map((player, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className="d-flex justify-content-between mb-3 pb-2 border-bottom"
                              >
                                <span style={{ color: "var(--text)" }}>{player.name} ({player.team})</span>
                                <span className="fw-bold" style={{ color: "var(--primary-blue)" }}>
                                  {section.format ? section.format(player[section.valueKey]) : `${player[section.valueKey]} ${section.suffix || ""}`}
                                </span>
                              </motion.div>
                            ))}
                            {section.data.length > (visiblePlayers[section.title] || 5) && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-center mt-3"
                              >
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="btn btn-outline-primary btn-sm px-4 py-1"
                                  onClick={() => handleLoadMorePlayers(section.title)}
                                >
                                  Load More
                                </motion.button>
                              </motion.div>
                            )}
                          </>
                        ) : (
                          <p className="text-muted">No data available.</p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default TournamentDetail;