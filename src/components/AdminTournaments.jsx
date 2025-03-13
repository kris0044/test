import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "./AdminLayout";
import api from "../utility/axiosInterceptor.js";

const AdminTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [editingTournament, setEditingTournament] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [overs, setOvers] = useState(3);
  const [teamStats, setTeamStats] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [userRole, setUserRole] = useState(null); // Track user role
  const tournamentsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchTournaments(), fetchTeams()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = JSON.parse(atob(token.split(".")[1])); // Decode JWT to get role
      setUserRole(decoded.role);

      const response = await api.get("/api/tournaments", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Tournaments data:", response.data);
      setTournaments(response.data);
      if (selectedTournament) {
        const updatedTournament = response.data.find((t) => t._id === selectedTournament._id);
        setSelectedTournament(updatedTournament);
        fetchPointsTable(updatedTournament._id);
      }
    } catch (error) {
      showToast("Error fetching tournaments");
      console.error("Fetch tournaments error:", error);
    }
  };

  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get("/api/teams", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTeams(response.data);
    } catch (error) {
      showToast("Error fetching teams");
    }
  };

  const fetchPointsTable = async (tournamentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await api.get(`/api/tournaments/${tournamentId}/points-table`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Points Table data:", response.data);
      setTeamStats(response.data);
    } catch (error) {
      showToast("Error fetching points table");
      console.error("Fetch points table error:", error);
    }
  };

  const showToast = (message) => {
    toast.info(message, { autoClose: 3000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return showToast("Only admins can add or update tournaments.");
    const token = localStorage.getItem("token");

    try {
      if (editingTournament) {
        await api.put(
          `/api/tournaments/${editingTournament._id}`,
          { name, startDate, endDate, teams: selectedTeams },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Tournament updated successfully");
      } else {
        await api.post(
          "/api/tournaments",
          { name, startDate, endDate, teams: selectedTeams },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Tournament added successfully");
      }
      fetchTournaments();
      resetForm();
      setShowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || "Error saving tournament");
    }
  };

  const handleEdit = (tournament) => {
    if (userRole !== "admin") return showToast("Only admins can edit tournaments.");
    setName(tournament.name);
    setStartDate(tournament.startDate.split("T")[0]);
    setEndDate(tournament.endDate.split("T")[0]);
    setSelectedTeams(tournament.teams ? tournament.teams.map((t) => t._id) : []);
    setEditingTournament(tournament);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (userRole !== "admin") return showToast("Only admins can delete tournaments.");
    const token = localStorage.getItem("token");
    try {
      await api.delete(`/api/tournaments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Tournament deleted successfully");
      fetchTournaments();
    } catch (error) {
      showToast("Error deleting tournament");
    }
  };

  const handleTeamChange = (e) => {
    if (userRole !== "admin") return; // Disable team selection for non-admins
    const options = e.target.options;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    setSelectedTeams(selected);
  };

  const resetForm = () => {
    setName("");
    setStartDate("");
    setEndDate("");
    setSelectedTeams([]);
    setEditingTournament(null);
    setOvers(3);
    setSelectedMatch(null);
  };

  const handleManageTournament = (tournament) => {
    setSelectedTournament(tournament);
    fetchPointsTable(tournament._id);
  };

  const scheduleLeagueMatches = async () => {
    if (userRole !== "admin") return showToast("Only admins can schedule matches.");
    const token = localStorage.getItem("token");
    try {
      await api.post(
        "/api/tournaments/schedule-league",
        { tournamentId: selectedTournament._id, overs },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("League matches scheduled successfully");
      fetchTournaments();
    } catch (error) {
      showToast(error.response?.data?.message || "Error scheduling league matches");
    }
  };

  const scheduleSemiFinals = async () => {
    if (userRole !== "admin") return showToast("Only admins can schedule matches.");
    const token = localStorage.getItem("token");
    try {
      if (teamStats.length < 4) {
        showToast("Need at least 4 teams with completed matches");
        return;
      }
      const top4Teams = teamStats.slice(0, 4).map((stat) => stat.teamId);
      await api.post(
        "/api/tournaments/schedule-semifinals",
        { tournamentId: selectedTournament._id, overs, teams: top4Teams },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Semi-finals scheduled successfully");
      fetchTournaments();
    } catch (error) {
      showToast(error.response?.data?.message || "Error scheduling semi-finals");
    }
  };

  const scheduleFinal = async () => {
    if (userRole !== "admin") return showToast("Only admins can schedule matches.");
    const token = localStorage.getItem("token");
    try {
      if (!selectedTournament.semiFinals || selectedTournament.semiFinals.length !== 2) {
        showToast("Need exactly 2 semi-finals scheduled");
        return;
      }

      const semiWinners = selectedTournament.semiFinals
        .filter((match) => match.winner)
        .map((match) => match.winner._id || match.winner);

      if (semiWinners.length !== 2) {
        showToast("Both semi-finals must have winners");
        return;
      }

      console.log("Scheduling final with teams:", semiWinners);
      await api.post(
        "/api/tournaments/schedule-final",
        { tournamentId: selectedTournament._id, overs, teams: semiWinners },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Final scheduled successfully");
      fetchTournaments();
    } catch (error) {
      showToast(error.response?.data?.message || "Error scheduling final");
      console.error("Schedule final error:", error.response?.data);
    }
  };

  const declareWinner = async () => {
    if (userRole !== "admin") return showToast("Only admins can declare winners.");
    const token = localStorage.getItem("token");
    try {
      await api.post(
        "/api/tournaments/declare-winner",
        { tournamentId: selectedTournament._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Tournament winner declared successfully");
      fetchTournaments();
      setSelectedTournament(null);
    } catch (error) {
      showToast(error.response?.data?.message || "Error declaring winner");
    }
  };

  const updateMatchResult = async (matchId, result) => {
    if (userRole !== "admin") return showToast("Only admins can update match results.");
    const token = localStorage.getItem("token");
    try {
      console.log("Updating match with data:", result);
      await api.put(
        `/api/tournaments/matches/${matchId}`,
        result,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast("Match result updated successfully");
      fetchTournaments();
      setSelectedMatch(null);
    } catch (error) {
      showToast(error.response?.data?.message || "Error updating match result");
      console.error("Update match error:", error.response?.data);
    }
  };

  const deleteMatch = async (matchId) => {
    if (userRole !== "admin") return showToast("Only admins can delete matches.");
    const token = localStorage.getItem("token");
    try {
      await api.delete(`/api/tournaments/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Match deleted successfully");
      fetchTournaments();
    } catch (error) {
      showToast("Error deleting match");
    }
  };

  const filteredTournaments = tournaments.filter((tournament) =>
    tournament.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastTournament = currentPage * tournamentsPerPage;
  const indexOfFirstTournament = indexOfLastTournament - tournamentsPerPage;
  const currentTournaments = filteredTournaments.slice(
    indexOfFirstTournament,
    indexOfLastTournament
  );
  const totalPages = Math.ceil(filteredTournaments.length / tournamentsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="container py-5 text-center">
          <h3>Loading...</h3>
        </div>
      </AdminLayout>
    );
  }

  const TournamentManagementView = () => (
    <div>
      <h3 className="text-center mb-4">
        Managing Tournament: {selectedTournament.name}
      </h3>
      <div className="mb-4">
        <button
          className="btn btn-outline-secondary"
          onClick={() => setSelectedTournament(null)}
        >
          Back to Tournaments
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Tournament Controls</h5>
          <div className="mb-3">
            <label htmlFor="overs" className="form-label fw-bold">
              Overs per Match
            </label>
            <input
              type="number"
              id="overs"
              value={overs}
              onChange={(e) => setOvers(e.target.value)}
              className="form-control w-25"
              min="1"
              disabled={userRole !== "admin"} // Disable for non-admins
            />
          </div>
          <div className="d-flex justify-content-between flex-wrap gap-3">
            <button
              className="btn btn-primary flex-grow-1"
              onClick={scheduleLeagueMatches}
              disabled={
                userRole !== "admin" ||
                (selectedTournament.matches && selectedTournament.matches.length > 0)
              } // Disable for non-admins or if matches exist
            >
              Schedule League
            </button>
            <button
              className="btn btn-info flex-grow-1"
              onClick={scheduleSemiFinals}
              disabled={
                userRole !== "admin" ||
                !selectedTournament.matches ||
                selectedTournament.matches.length === 0 ||
                selectedTournament.semiFinals.length > 0 ||
                teamStats.length < 4
              } // Disable for non-admins or if conditions not met
            >
              Schedule Semi-Finals
            </button>
            <button
              className="btn btn-warning flex-grow-1"
              onClick={scheduleFinal}
              disabled={
                userRole !== "admin" ||
                selectedTournament.semiFinals.length !== 2 ||
                selectedTournament.final ||
                selectedTournament.semiFinals.filter((m) => m.winner).length !== 2
              } // Disable for non-admins or if conditions not met
            >
              Schedule Final
            </button>
            <button
              className="btn btn-success flex-grow-1"
              onClick={declareWinner}
              disabled={
                userRole !== "admin" ||
                !selectedTournament.final ||
                selectedTournament.status === "Completed"
              } // Disable for non-admins or if conditions not met
            >
              Declare Winner
            </button>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Points Table</h5>
          <div className="table-responsive">
            <table className="table table-striped">
              <thead className="table-dark">
                <tr>
                  <th>Team</th>
                  <th>Matches</th>
                  <th>Points</th>
                  <th>NRR</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map((stat, index) => (
                  <tr key={stat.teamId} className={index < 4 ? "table-success" : ""}>
                    <td>
                      {selectedTournament.status === "Completed" &&
                      selectedTournament.winner?._id === stat.teamId
                        ? `(W) ${stat.team}`
                        : stat.team}
                    </td>
                    <td>{stat.matches}</td>
                    <td>{stat.points}</td>
                    <td>{stat.nrr !== undefined ? stat.nrr : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <h5 className="card-title">Matches</h5>
          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <a className="nav-link active" href="#league" data-bs-toggle="tab">
                League
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#semifinals" data-bs-toggle="tab">
                Semi-Finals
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="#final" data-bs-toggle="tab">
                Final
              </a>
            </li>
          </ul>
          <div className="tab-content">
            <div className="tab-pane fade show active" id="league">
              <MatchList matches={selectedTournament.matches} />
            </div>
            <div className="tab-pane fade" id="semifinals">
              <MatchList matches={selectedTournament.semiFinals} />
            </div>
            <div className="tab-pane fade" id="final">
              {selectedTournament.final ? (
                <MatchList matches={[selectedTournament.final]} />
              ) : (
                <p>No final scheduled yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <MatchResultModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onSave={updateMatchResult}
        />
      )}
    </div>
  );

  const MatchList = ({ matches }) => (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Teams</th>
            <th>Type</th>
            <th>Status</th>
            <th>Result</th>
            <th>Winner</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match, index) => {
            const innings1Runs = match.runsScored?.innings1 || 0;
            const innings2Runs = match.runsScored?.innings2 || 0;
            const innings1Wickets = match.wickets?.innings1 || 0;
            const innings2Wickets = match.wickets?.innings2 || 0;
            const innings1Overs = match.oversBowled?.innings1 || 0;
            const innings2Overs = match.oversBowled?.innings2 || 0;
            const maxWickets = 10;
            let victoryMargin = "";

            console.log(`Match ${index + 1} Raw Data:`, {
              innings1Overs: match.oversBowled?.innings1,
              innings2Overs: match.oversBowled?.innings2,
              totalOvers: match.overs,
              status: match.status,
              winner: match.winner,
            });

            if (match.status === "Completed" && match.winner) {
              const winnerId = match.winner._id
                ? match.winner._id.toString()
                : match.winner.toString();
              const team1Id = match.teams[0]?._id
                ? match.teams[0]._id.toString()
                : match.teams[0]?.toString();
              const team2Id = match.teams[1]?._id
                ? match.teams[1]._id.toString()
                : match.teams[1]?.toString();

              if (winnerId === team2Id && innings2Runs >= innings1Runs) {
                victoryMargin = `by ${maxWickets - innings2Wickets} wickets`;
              } else if (winnerId === team1Id && innings1Runs > innings2Runs) {
                victoryMargin = `by ${innings1Runs - innings2Runs} runs`;
              } else {
                victoryMargin = "(Declared winner)";
              }
            }

            const formatOvers = (overs) => {
              if (overs === null || overs === undefined) return "0.0";
              const roundedOvers = Math.round(overs * 10) / 10;
              return Number.isInteger(roundedOvers)
                ? `${roundedOvers}.0`
                : roundedOvers.toString();
            };

            return (
              <tr key={match._id}>
                <td>
                  {match.teams && match.teams.length === 2
                    ? `${match.teams[0]?.name || "N/A"} vs ${
                        match.teams[1]?.name || "N/A"
                      }`
                    : "N/A vs N/A"}
                </td>
                <td>{match.matchType}</td>
                <td>{match.status}</td>
                <td>
                  {match.status === "Completed"
                    ? `${innings1Runs}/${innings1Wickets} (${formatOvers(
                        innings1Overs
                      )} ov) vs ${innings2Runs}/${innings2Wickets} (${formatOvers(
                        innings2Overs
                      )} ov)`
                    : "Not played"}
                </td>
                <td>
                  {match.status === "Completed" && match.winner
                    ? `${match.winner.name || "Unknown"} ${
                        victoryMargin ? `(${victoryMargin})` : ""
                      }`
                    : "N/A"}
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary me-2"
                    onClick={() => setSelectedMatch(match)}
                    disabled={userRole !== "admin" || match.status === "Completed"} // Disable for non-admins or completed matches
                  >
                    Update Result
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteMatch(match._id)}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const MatchResultModal = ({ match, onClose, onSave }) => {
    const [innings1Runs, setInnings1Runs] = useState(match.runsScored?.innings1 || 0);
    const [innings2Runs, setInnings2Runs] = useState(match.runsScored?.innings2 || 0);
    const [innings1Overs, setInnings1Overs] = useState(
      match.oversBowled?.innings1 || 0
    );
    const [innings2Overs, setInnings2Overs] = useState(
      match.oversBowled?.innings2 || 0
    );
    const [winner, setWinner] = useState(match.winner?._id || "");

    const handleSubmit = (e) => {
      e.preventDefault();
      const overs1 = Number(innings1Overs);
      const overs2 = Number(innings2Overs);
      const validatedOvers1 =
        overs1 === Math.floor(overs1) ? overs1 : Math.round(overs1 * 10) / 10;
      const validatedOvers2 =
        overs2 === Math.floor(overs2) ? overs2 : Math.round(overs2 * 10) / 10;

      const result = {
        runsScored: { innings1: Number(innings1Runs), innings2: Number(innings2Runs) },
        oversBowled: { innings1: validatedOvers1, innings2: validatedOvers2 },
        winner: winner || null,
      };
      console.log("Submitting match result:", result);
      onSave(match._id, result);
    };

    return (
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                Update Match Result: {match.teams.map((t) => t.name || "N/A").join(" vs ")}
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    Innings 1 Runs ({match.teams[0]?.name || "Team 1"})
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={innings1Runs}
                    onChange={(e) => setInnings1Runs(e.target.value)}
                    min="0"
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Innings 1 Overs</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={innings1Overs}
                    onChange={(e) => setInnings1Overs(e.target.value)}
                    min="0"
                    max={match.overs}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Innings 2 Runs ({match.teams[1]?.name || "Team 2"})
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={innings2Runs}
                    onChange={(e) => setInnings2Runs(e.target.value)}
                    min="0"
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Innings 2 Overs</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={innings2Overs}
                    onChange={(e) => setInnings2Overs(e.target.value)}
                    min="0"
                    max={match.overs}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Winner</label>
                  <select
                    className="form-control"
                    value={winner}
                    onChange={(e) => setWinner(e.target.value)}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">No winner (Tie)</option>
                    {match.teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name || "N/A"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={userRole !== "admin"} // Disable for non-admins
                >
                  Save Result
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <ToastContainer />

      <div className="container py-5">
        {selectedTournament ? (
          <TournamentManagementView />
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="w-50">
                <input
                  type="text"
                  placeholder="Search Tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-control"
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (userRole !== "admin")
                    return showToast("Only admins can add tournaments.");
                  resetForm();
                  setShowModal(true);
                }}
                disabled={userRole !== "admin"} // Disable for non-admins
              >
                Add New Tournament
              </button>
            </div>

            <h3 className="text-center mb-4">Tournaments List</h3>
            <div className="table-responsive">
              <table className="table table-bordered table-striped text-center">
                <thead className="table-dark">
                  <tr>
                    <th>Name</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Teams</th>
                    <th>Status</th>
                    <th>Winner</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentTournaments.map((tournament) => (
                    <tr key={tournament._id}>
                      <td>{tournament.name}</td>
                      <td>{new Date(tournament.startDate).toLocaleDateString()}</td>
                      <td>{new Date(tournament.endDate).toLocaleDateString()}</td>
                      <td>
                        {tournament.teams && Array.isArray(tournament.teams)
                          ? tournament.teams.map((t) => t.name).join(", ")
                          : "No teams"}
                      </td>
                      <td>{tournament.status}</td>
                      <td>
                        {tournament.status === "Completed" && tournament.winner
                          ? tournament.winner.name
                          : "N/A"}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-info me-2"
                          onClick={() => handleManageTournament(tournament)}
                          disabled={userRole !== "admin"} // Disable for non-admins

                        >
                          Manage
                        </button>
                        <button
                          className="btn btn-sm btn-warning me-2"
                          onClick={() => handleEdit(tournament)}
                          disabled={userRole !== "admin"} // Disable for non-admins
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(tournament._id)}
                          disabled={userRole !== "admin"} // Disable for non-admins
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <button
                className="btn btn-secondary"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </>
        )}

        <div
          className={`modal fade ${showModal ? "show d-block" : ""}`}
          tabIndex="-1"
          style={{ backgroundColor: showModal ? "rgba(0,0,0,0.5)" : "transparent" }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingTournament ? "Edit Tournament" : "Add Tournament"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="tournamentName" className="form-label">
                      Name
                    </label>
                    <input
                      type="text"
                      id="tournamentName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-control"
                      required
                      disabled={userRole !== "admin"} // Disable for non-admins
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="startDate" className="form-label">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="form-control"
                      required
                      disabled={userRole !== "admin"} // Disable for non-admins
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="endDate" className="form-label">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="form-control"
                      required
                      disabled={userRole !== "admin"} // Disable for non-admins
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="teams" className="form-label">
                      Teams
                    </label>
                    <select
                      multiple
                      id="teams"
                      value={selectedTeams}
                      onChange={handleTeamChange}
                      className="form-control"
                      style={{ height: "150px" }}
                      disabled={userRole !== "admin"} // Disable for non-admins
                    >
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    <small className="form-text text-muted">
                      Hold Ctrl/Cmd to select multiple teams
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    {editingTournament ? "Update Tournament" : "Add Tournament"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTournaments;