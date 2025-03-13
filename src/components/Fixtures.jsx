import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import api from "../utility/axiosInterceptor.js";
import { motion } from "framer-motion";

function Fixtures() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("ALL TEAMS");
  const [selectedTournament, setSelectedTournament] = useState("ALL TOURNAMENTS");
  const [activeTab, setActiveTab] = useState("Series"); // Default to "Series" tab
  const [visibleRows, setVisibleRows] = useState(2); // Show 2 rows by default (6 matches)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const matchesResponse = await api.get("/api/matches");
        const sortedMatches = matchesResponse.data.sort((a, b) => {
          // Prioritize Scheduled matches first
          if (a.status === "Scheduled" && b.status !== "Scheduled") return -1;
          if (a.status !== "Scheduled" && b.status === "Scheduled") return 1;
          return new Date(a.startTime) - new Date(b.startTime); // Then sort by date
        });
        setMatches(sortedMatches);
        setFilteredMatches(sortedMatches);

        const teamsResponse = await api.get("/api/teams");
        setTeams(teamsResponse.data);

        const tournamentsResponse = await api.get("/api/tournaments");
        setTournaments(tournamentsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Filter matches by selected team and tournament
  useEffect(() => {
    let filtered = matches;

    if (selectedTeam !== "ALL TEAMS") {
      filtered = filtered.filter((match) =>
        match.teams.some((team) => team.name === selectedTeam)
      );
    }

    if (activeTab === "Series" && selectedTournament !== "ALL TOURNAMENTS") {
      filtered = filtered.filter(
        (match) => match.tournament?.name === selectedTournament
      );
    }

    setFilteredMatches(filtered);
  }, [selectedTeam, selectedTournament, activeTab, matches]);

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const chunkMatches = (matches, size) => {
    const chunked = [];
    for (let i = 0; i < matches.length; i += size) {
      chunked.push(matches.slice(i, i + size));
    }
    return chunked;
  };

  const handleTeamFilterChange = (e) => {
    setSelectedTeam(e.target.value);
    setVisibleRows(2); // Reset visible rows when filter changes
  };

  const handleTournamentFilterChange = (e) => {
    setSelectedTournament(e.target.value);
    setVisibleRows(2); // Reset visible rows when filter changes
  };

  const renderMatches = () => {
    const groupedMatches = activeTab === "Series"
      ? groupMatchesBySeries(filteredMatches)
      : groupMatchesByTeam(filteredMatches);

    const sortedGroups = Object.keys(groupedMatches).sort();

    if (sortedGroups.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-muted fs-5 py-5"
        >
          No matches available.
        </motion.div>
      );
    }

    return sortedGroups.map((groupName) => {
      const matchesInGroup = chunkMatches(groupedMatches[groupName], 3);
      const rowsToShow = matchesInGroup.slice(0, visibleRows);
      const hasMore = matchesInGroup.length > visibleRows;

      return (
        <motion.div
          key={groupName}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <h3 className="mb-4 fw-bold" style={{ color: "var(--text)" }}>{groupName}</h3>
          {rowsToShow.map((row, rowIndex) => (
            <motion.div
              key={rowIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: rowIndex * 0.2 }}
              className="d-flex flex-wrap justify-content-between mb-4 gap-3"
            >
              {row.map((match) => {
                const team1 = match.teams[0] || { name: "Team 1" };
                const team2 = match.teams[1] || { name: "Team 2" };
                const team1Score = match.status === "Completed" || match.status === "Ongoing"
                  ? `${match.runsScored?.innings1 || match.runsScored?.["innings1"] || 0}/${match.wickets?.innings1 || match.wickets?.["innings1"] || 0} (${match.oversBowled?.innings1 || match.oversBowled?.["innings1"] || 0})`
                  : "Yet to bat";
                const team2Score = match.status === "Completed" || match.status === "Ongoing"
                  ? `${match.runsScored?.innings2 || match.runsScored?.["innings2"] || 0}/${match.wickets?.innings2 || match.wickets?.["innings2"] || 0} (${match.oversBowled?.innings2 || match.oversBowled?.["innings2"] || 0})`
                  : "Yet to bat";

                return (
                  <motion.div
                    key={match._id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex-grow-1"
                    style={{ flexBasis: "30%", minWidth: "300px" }}
                  >
                    <Link to={`/match/${match._id}`} className="text-decoration-none">
                      <div className="match-card p-4 rounded-3 shadow-lg" style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)" }}>
                        <div className="d-flex justify-content-between align-items-center flex-wrap">
                          <div className="d-flex align-items-center">
                            <span
                              className="rounded-circle me-2"
                              style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #007bff, #0056b3)" }}
                            ></span>
                            <div>
                              <h6 className="mb-1 fw-bold" style={{ color: "var(--text)" }}>{team1.name}</h6>
                              <p className="mb-0 text-muted small">{team1Score}</p>
                            </div>
                          </div>
                          <span className="text-muted fw-bold mx-3">VS</span>
                          <div className="d-flex align-items-center">
                            <div>
                              <h6 className="mb-1 fw-bold" style={{ color: "var(--text)" }}>{team2.name}</h6>
                              <p className="mb-0 text-muted small">{team2Score}</p>
                            </div>
                            <span
                              className="rounded-circle ms-2"
                              style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #ffd700, #ffa500)" }}
                            ></span>
                          </div>
                        </div>
                        <div className="text-center mt-3">
                          {match.status === "Completed" && match.result ? (
                            <p className="text-muted small mb-0">{match.result}</p>
                          ) : match.status === "Ongoing" ? (
                            <span className="badge bg-danger py-1 px-2">Live</span>
                          ) : (
                            <p className="text-muted small mb-0">
                              {formatTime(match.startTime)}, {formatDate(match.startTime)}
                            </p>
                          )}
                          <p className="text-muted small mt-1">{match.tournament?.name || "Unknown Series"}, {match.matchType}</p>
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
                  style={{ flexBasis: "30%", minWidth: "300px" }}
                ></div>
              ))}
            </motion.div>
          ))}
          {hasMore && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-4"
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
        </motion.div>
      );
    });
  };

  const groupMatchesBySeries = (matches) => {
    const grouped = {};
    matches.forEach((match) => {
      const seriesName = match.tournament?.name || "Unknown Series";
      if (!grouped[seriesName]) {
        grouped[seriesName] = [];
      }
      grouped[seriesName].push(match);
    });
    return grouped;
  };

  const groupMatchesByTeam = (matches) => {
    const grouped = {};
    matches.forEach((match) => {
      match.teams.forEach((team) => {
        const teamName = team.name || "Unknown Team";
        if (!grouped[teamName]) {
          grouped[teamName] = [];
        }
        grouped[teamName].push(match);
      });
    });
    return grouped;
  };

  return (
    <div 
      className="d-flex flex-column min-vh-100" 
      style={{ background: "linear-gradient(to bottom, #f8f9fa 0%, #e9ecef 100%)" }}
    >
      <Header />
      <div className="container py-5 flex-grow-1">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="d-flex justify-content-between align-items-center mb-5"
        >
          <ul className="nav nav-tabs border-0">
            {["Series", "Teams"].map((tab) => (
              <li key={tab} className="nav-item me-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`nav-link border-0 bg-transparent position-relative ${activeTab === tab ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab(tab);
                    setVisibleRows(2); // Reset visible rows when tab changes
                  }}
                  style={{
                    color: activeTab === tab ? "var(--primary-yellow)" : "var(--text-muted)",
                    padding: "12px 25px",
                    fontWeight: activeTab === tab ? "600" : "normal",
                    background: activeTab === tab ? "rgba(255, 215, 0, 0.1)" : "transparent",
                    borderRadius: "8px",
                    transition: "all 0.3s ease",
                  }}
                >
                  {tab}
                  <span
                    className="position-absolute"
                    style={{
                      bottom: "0",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: activeTab === tab ? "80%" : "0",
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
          <div className="dropdown">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn btn-outline-primary dropdown-toggle"
              type="button"
              id="filterDropdown"
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              Filter Fixtures
            </motion.button>
            <ul className="dropdown-menu p-3" aria-labelledby="filterDropdown" style={{ minWidth: "250px" }}>
              {activeTab === "Series" && (
                <li className="mb-3">
                  <h6 className="dropdown-header fw-bold mb-2">Tournament</h6>
                  <select
                    className="form-select"
                    value={selectedTournament}
                    onChange={handleTournamentFilterChange}
                  >
                    <option value="ALL TOURNAMENTS">ALL TOURNAMENTS</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament._id} value={tournament.name}>
                        {tournament.name}
                      </option>
                    ))}
                  </select>
                </li>
              )}
              <li>
                <h6 className="dropdown-header fw-bold mb-2">Team</h6>
                <select
                  className="form-select"
                  value={selectedTeam}
                  onChange={handleTeamFilterChange}
                >
                  <option value="ALL TEAMS">ALL TEAMS</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </li>
            </ul>
          </div>
        </motion.div>

        {renderMatches()}
      </div>
    </div>
  );
}

export default Fixtures;