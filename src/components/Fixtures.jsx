import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import api from "../utility/axiosInterceptor.js";
import { motion } from "framer-motion";
import LoadingSpinner from "./LoadingSpinner";

const socket = io(api.defaults.baseURL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket"],
  forceNew: false,
  pingInterval: 10000,
  pingTimeout: 5000,
});

function Fixtures() {
  const [groupedMatches, setGroupedMatches] = useState({});
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [scores, setScores] = useState({});
  const [selectedTeam, setSelectedTeam] = useState("ALL TEAMS");
  const [selectedTournament, setSelectedTournament] = useState("ALL TOURNAMENTS");
  const [activeTab, setActiveTab] = useState("Series");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const limit = 6; // Default to 6 matches per page

  useEffect(() => {
    if (page === 1) {
      fetchFilteredData();
    } else {
      loadMoreData();
    }
  }, [page, selectedTeam, selectedTournament, activeTab]);

  const fetchFilteredData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/fixtures/filtered", {
        params: {
          page: 1,
          limit,
          team: selectedTeam,
          tournament: selectedTournament,
          tab: activeTab,
        },
      });
      const { groupedMatches, teams, tournaments, scores, totalPages } = response.data;

      console.log("Fetched filtered fixtures:", response.data);
      setGroupedMatches(groupedMatches);
      setTeams(teams);
      setTournaments(tournaments);
      setScores(scores);
      setTotalPages(totalPages);
      setPage(1); // Ensure page is reset
    } catch (error) {
      console.error("Error fetching filtered fixtures:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get("/api/fixtures/load-more", {
        params: {
          page,
          limit,
          team: selectedTeam,
          tournament: selectedTournament,
          tab: activeTab,
        },
      });
      const { groupedMatches: newGroupedMatches, totalPages } = response.data;

      console.log("Loaded more fixtures:", response.data);
      setGroupedMatches((prev) => mergeGroupedMatches(prev, newGroupedMatches));
      setTotalPages(totalPages);
    } catch (error) {
      console.error("Error loading more fixtures:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const mergeGroupedMatches = (prev, newGrouped) => {
    const merged = { ...prev };
    Object.keys(newGrouped).forEach((group) => {
      if (!merged[group]) {
        merged[group] = [];
      }
      merged[group] = [...merged[group], ...newGrouped[group]];
    });
    return merged;
  };

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Fixtures: Connected to socket server");
      socket.emit("joinMatches");
    });

    socket.on("matchUpdate", (updatedMatch) => {
      console.log("Fixtures: Received matchUpdate", updatedMatch);
      setGroupedMatches((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((group) => {
          updated[group] = updated[group].map((match) =>
            match._id === updatedMatch._id ? { ...match, ...updatedMatch } : match
          );
        });
        return updated;
      });
    });

    socket.on("scoreUpdate", (newScore) => {
      console.log("Fixtures: Received scoreUpdate", newScore);
      setScores((prevScores) => {
        const matchId = newScore.match.toString();
        const updatedScores = { ...prevScores };
        if (!updatedScores[matchId]) updatedScores[matchId] = [];
        updatedScores[matchId] = [...updatedScores[matchId], newScore];
        return updatedScores;
      });
    });

    socket.on("newMatch", (newMatch) => {
      console.log("Fixtures: Received newMatch", newMatch);
      setGroupedMatches((prev) => {
        const groupName =
          activeTab === "Series"
            ? newMatch.tournament?.name || "Unknown Series"
            : newMatch.teams[0]?.name || "Unknown Team"; // Simplified for first team
        const updated = { ...prev };
        if (!updated[groupName]) updated[groupName] = [];
        updated[groupName].push(newMatch);
        return updated;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("matchUpdate");
      socket.off("scoreUpdate");
      socket.off("newMatch");
    };
  }, [activeTab]);

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
    setPage(1); // Reset to first page on filter change
  };

  const handleTournamentFilterChange = (e) => {
    setSelectedTournament(e.target.value);
    setPage(1); // Reset to first page on filter change
  };

  const getWinnerName = (match) => {
    if (!match.winner || !match.winner._id) return null;
    const winningTeam = match.teams.find((team) => team._id.toString() === match.winner._id.toString());
    return winningTeam ? winningTeam.name : "Unknown Winner";
  };

  const renderMatches = () => {
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
      return (
        <motion.div
          key={groupName}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-5"
        >
          <h3 className="mb-4 fw-bold" style={{ color: "var(--text-color)" }}>
            {groupName}
          </h3>
          {matchesInGroup.map((row, rowIndex) => (
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
                const team1Score =
                  match.status === "Completed" ||
                  match.status === "Ongoing" ||
                  match.status === "Stopped" ||
                  match.status === "Cancelled"
                    ? `${match.runsScored?.innings1 || 0}/${
                        match.wickets?.innings1 || 0
                      } (${match.oversBowled?.innings1 || 0} ov)`
                    : "Yet to bat";
                const team2Score =
                  match.status === "Completed" ||
                  match.status === "Ongoing" ||
                  match.status === "Stopped" ||
                  match.status === "Cancelled"
                    ? `${match.runsScored?.innings2 || 0}/${
                        match.wickets?.innings2 || 0
                      } (${match.oversBowled?.innings2 || 0} ov)`
                    : "Yet to bat";

                const teamVsTeam = (
                  <div className="d-flex justify-content-center align-items-center">
                    <span
                      className="rounded-circle me-2"
                      style={{
                        width: "40px",
                        height: "40px",
                        background: "linear-gradient(135deg, #007bff, #0056b3)",
                      }}
                    ></span>
                    <span>
                      {team1.name} {team1Score}
                    </span>
                    <span className="text-muted fw-bold mx-3">VS</span>
                    <span>
                      {team2.name} {team2Score}
                    </span>
                    <span
                      className="rounded-circle ms-2"
                      style={{
                        width: "40px",
                        height: "40px",
                        background: "linear-gradient(135deg, #ffd700, #ffa500)",
                      }}
                    ></span>
                  </div>
                );

                let resultText = "";
                if (match.status === "Completed") {
                  const winnerName = getWinnerName(match);
                  if (winnerName) {
                    resultText = `${winnerName} won`;
                  } else if (
                    match.runsScored?.innings1 === match.runsScored?.innings2
                  ) {
                    resultText = "Match Tied";
                  } else {
                    resultText = "Completed - No winner declared";
                  }
                } else if (match.status === "Stopped") {
                  resultText = `Stopped - ${match.stopReason || "Reason not provided"}`;
                } else if (match.status === "Cancelled") {
                  resultText = `Cancelled ${match.stopReason ? `- ${match.stopReason}` : ""}`;
                } else if (match.status === "Ongoing") {
                  resultText = "Live";
                } else {
                  resultText = `${formatTime(match.startTime)}, ${formatDate(match.startTime)}`;
                }

                return (
                  <motion.div
                    key={match._id}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="flex-grow-1"
                    style={{ flexBasis: "30%", minWidth: "300px" }}
                  >
                    <Link to={`/match/${match._id}`} className="text-decoration-none">
                      <div
                        className="match-card p-3 rounded-3 shadow-lg"
                        style={{
                          background: "var(--card-bg-gradient)",
                          position: "relative",
                          height: "180px",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="text-muted small fw-bold">
                            {match.tournament?.name || "Unknown Series"} -{" "}
                            {match.matchType}
                          </div>
                          <div
                            className={`text-muted small fw-bold ${
                              match.status === "Ongoing"
                                ? "text-danger"
                                : match.status === "Stopped"
                                ? "text-warning"
                                : match.status === "Cancelled"
                                ? "text-danger"
                                : match.status === "Completed"
                                ? "text-success"
                                : ""
                            }`}
                          >
                            {match.status}
                          </div>
                        </div>
                        <div className="text-center mb-5">
                          <h6 className="fw-bold" style={{ color: "var(--text-color)" }}>
                            {teamVsTeam}
                          </h6>
                        </div>
                        <div className="d-flex">
                          <div
                            className="text-muted small position-absolute"
                            style={{ bottom: "10px", left: "10px" }}
                          >
                            {resultText}
                          </div>
                          <div
                            className="text-muted small position-absolute"
                            style={{ bottom: "30px", left: "10px" }}
                          >
                            Venue: {match.venue?.name || "TBD"}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, idx) => (
                  <div
                    key={`filler-${rowIndex}-${idx}`}
                    className="flex-grow-1 invisible"
                    style={{ flexBasis: "30%", minWidth: "300px" }}
                  ></div>
                ))}
            </motion.div>
          ))}
        </motion.div>
      );
    });
  };

  const handleLoadMore = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <div
      className="d-flex flex-column min-vh-100"
      style={{
        background: "var(--background-gradient)",
        position: "relative",
      }}
    >
      <Header />
      {isLoading && <LoadingSpinner size="large" message="Loading Fixtures..." />}
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
                  className={`nav-link border-0 bg-transparent position-relative ${
                    activeTab === tab ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1); // Reset to first page on tab change
                  }}
                  style={{
                    color:
                      activeTab === tab ? "var(--primary-yellow)" : "var(--muted-text)",
                    padding: "12px 25px",
                    fontWeight: activeTab === tab ? "600" : "normal",
                    background:
                      activeTab === tab ? "var(--active-tab-bg)" : "transparent",
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
            <ul
              className="dropdown-menu p-3"
              aria-labelledby="filterDropdown"
              style={{ minWidth: "250px" }}
            >
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
        {page < totalPages && (
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
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load More"}
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Fixtures;