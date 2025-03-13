import { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import api from "../utility/axiosInterceptor.js";

const CreateMatch = () => {
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [overs, setOvers] = useState("");
  const [assignedScorer, setAssignedScorer] = useState("");
  const [matches, setMatches] = useState([]);
  const [editMatch, setEditMatch] = useState(null);
  const [editData, setEditData] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRole, setUserRole] = useState(null); // Track user role
  const [userId, setUserId] = useState(null); // Track user ID for scorer filtering
  const matchesPerPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Decode JWT to get role and id
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }
        const decoded = JSON.parse(atob(token.split(".")[1]));
        setUserRole(decoded.role);
        setUserId(decoded.id);

        const [teamsRes, tournamentsRes, matchesRes, scorersRes] = await Promise.all([
          api.get("/api/teams"),
          api.get("/api/tournaments"),
          api.get("/api/matches"),
          api.get("/api/users/users?role=scorer"), // Fixed endpoint (removed extra /users)
        ]);
        setTeams(teamsRes.data);
        setTournaments(tournamentsRes.data);
        setScorers(scorersRes.data);
        console.log("Scorers fetched:", scorersRes.data); // Debug scorers

        // Filter matches for scorers
        if (decoded.role === "scorer") {
          const filteredMatches = matchesRes.data.filter(
            (match) => match.assignedScorer?._id === decoded.id
          );
          setMatches(filteredMatches);
        } else {
          setMatches(matchesRes.data);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error("Error fetching initial data");
      }
    };
    fetchData();
  }, [navigate]);

  const fetchMatches = async () => {
    try {
      const res = await api.get("/api/matches");
      if (userRole === "scorer") {
        const filteredMatches = res.data.filter(
          (match) => match.assignedScorer?._id === userId
        );
        setMatches(filteredMatches);
      } else {
        setMatches(res.data);
      }
    } catch (err) {
      console.error("Error fetching matches:", err);
      toast.error("Error fetching matches");
    }
  };

  const handleTeamChange = (teamId) => {
    if (userRole !== "admin") return; // Disable team selection for non-admins
    setSelectedTeams((prev) =>
      prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : prev.length < 2
        ? [...prev, teamId]
        : prev
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (userRole !== "admin") return toast.error("Only admins can create matches.");
    if (selectedTeams.length !== 2) return toast.error("Select exactly 2 teams.");
    if (!overs || overs < 1) return toast.error("Enter valid overs.");
    if (!selectedTournament) return toast.error("Select a tournament.");

    const scorerId = assignedScorer === "" ? null : assignedScorer;

    api
      .post("/api/matches", {
        teams: selectedTeams,
        overs,
        tournament: selectedTournament,
        assignedScorer: scorerId,
      })
      .then(() => {
        toast.success("Match created!");
        setSelectedTeams([]);
        setOvers("");
        setSelectedTournament("");
        setAssignedScorer("");
        setShowCreateModal(false);
        fetchMatches();
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.error || "Error creating match";
        toast.error(errorMsg);
        if (err.response?.status === 403) {
          toast.error("You must be an admin to create matches.");
        }
      });
  };

  const handleUpdate = (id) => {
    if (userRole !== "admin") return toast.error("Only admins can update matches.");

    const updatePayload = {};
    if (editData.overs) updatePayload.overs = editData.overs;
    if (editData.status) updatePayload.status = editData.status;
    if (editData.battingTeam) updatePayload.battingTeam = editData.battingTeam;
    if (editData.bowlingTeam) updatePayload.bowlingTeam = editData.bowlingTeam;
    if (editData.runsScored) updatePayload.runsScored = editData.runsScored;
    if (editData.wickets) updatePayload.wickets = editData.wickets;
    if (editData.oversBowled) updatePayload.oversBowled = editData.oversBowled;
    if (editData.target) updatePayload.target = editData.target;
    if (editData.assignedScorer) {
      updatePayload.assignedScorer = editData.assignedScorer === "" ? null : editData.assignedScorer;
    }

    api
      .put(`/api/matches/${id}`, updatePayload)
      .then(() => {
        toast.success("Match updated!");
        setEditMatch(null);
        setEditData({});
        fetchMatches();
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.error || "Error updating match";
        toast.error(errorMsg);
        if (err.response?.status === 403) {
          toast.error("You must be an admin to update matches.");
        }
      });
  };

  const handleDelete = (id) => {
    if (userRole !== "admin") return toast.error("Only admins can delete matches.");

    api
      .delete(`/api/matches/${id}`)
      .then(() => {
        toast.success("Match deleted!");
        fetchMatches();
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.error || "Error deleting match";
        toast.error(errorMsg);
        if (err.response?.status === 403) {
          toast.error("You must be an admin to delete matches.");
        }
      });
  };

  const handleView = (match) => {
    navigate(`/score/${match._id}`);
  };

  const filteredMatches = matches.filter((match) =>
    [
      match.teams[0]?.name,
      match.teams[1]?.name,
      match.tournament?.name,
      match.overs.toString(),
      match.status,
      match.assignedScorer?.name || "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const indexOfLastMatch = currentPage * matchesPerPage;
  const indexOfFirstMatch = indexOfLastMatch - matchesPerPage;
  const currentMatches = filteredMatches.slice(indexOfFirstMatch, indexOfLastMatch);
  const totalPages = Math.ceil(filteredMatches.length / matchesPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <AdminLayout>
      <div className="container mt-5">
        <h3 className="text-center mb-4">Matches</h3>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="col-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search matches..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
            disabled={userRole !== "admin"} // Disable for non-admins
          >
            Create Match
          </button>
        </div>

        <table className="table table-bordered mt-3">
          <thead className="table-dark">
            <tr>
              <th>#</th>
              <th>Team 1</th>
              <th>Team 2</th>
              <th>Tournament</th>
              <th>Overs</th>
              <th>Status</th>
              <th>Scorer</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentMatches.length > 0 ? (
              currentMatches.map((match, index) => (
                <tr key={match._id}>
                  <td>{indexOfFirstMatch + index + 1}</td>
                  <td>{match.teams[0]?.name || "N/A"}</td>
                  <td>{match.teams[1]?.name || "N/A"}</td>
                  <td>{match.tournament?.name || "N/A"}</td>
                  <td>{match.overs}</td>
                  <td>{match.status}</td>
                  <td>{match.assignedScorer?.name || "Not Assigned"}</td>
                  <td>
                    <button
                      className="btn btn-info btn-sm me-2"
                      onClick={() => handleView(match)}
                    >
                      {userRole === "scorer" ? "Score" : "👁 View"}
                    </button>
                    <button
                      className="btn btn-warning btn-sm me-2"
                      onClick={() => {
                        setEditMatch(match._id);
                        setEditData({
                          overs: match.overs,
                          status: match.status,
                          battingTeam: match.battingTeam?._id,
                          bowlingTeam: match.bowlingTeam?._id,
                          runsScored: match.runsScored,
                          wickets: match.wickets,
                          oversBowled: match.oversBowled,
                          target: match.target,
                          assignedScorer: match.assignedScorer?._id || "",
                        });
                      }}
                      disabled={userRole !== "admin"} // Disable for non-admins
                    >
                      ✏ Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(match._id)}
                      disabled={userRole !== "admin"} // Disable for non-admins
                    >
                      ❌ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="text-center">
                  No matches found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button
              className="btn btn-primary"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="btn btn-primary"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {showCreateModal && (
          <div
            className="modal d-block bg-dark bg-opacity-50"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content p-4">
                <h2 className="text-center mb-4">Create a Match</h2>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Tournament:</label>
                    <select
                      className="form-control"
                      value={selectedTournament}
                      onChange={(e) => setSelectedTournament(e.target.value)}
                      required
                      disabled={userRole !== "admin"} // Disable for non-admins
                    >
                      <option value="">Select a Tournament</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament._id} value={tournament._id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Select Two Teams:</label>
                    <div className="d-flex flex-wrap gap-2">
                      {teams.map((team) => (
                        <button
                          key={team._id}
                          type="button"
                          className={`btn ${
                            selectedTeams.includes(team._id)
                              ? "btn-primary"
                              : "btn-outline-secondary"
                          }`}
                          onClick={() => handleTeamChange(team._id)}
                          disabled={userRole !== "admin"} // Disable for non-admins
                        >
                          {team.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Overs:</label>
                    <input
                      type="number"
                      value={overs}
                      onChange={(e) => setOvers(e.target.value)}
                      className="form-control"
                      placeholder="Enter overs"
                      min="1"
                      required
                      disabled={userRole !== "admin"} // Disable for non-admins
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Assign Scorer:</label>
                    <select
                      className="form-control"
                      value={assignedScorer}
                      onChange={(e) => setAssignedScorer(e.target.value)}
                      disabled={userRole !== "admin"} // Disable for non-admins
                    >
                      <option value="">Select a Scorer (Optional)</option>
                      {scorers.map((scorer) => (
                        <option key={scorer._id} value={scorer._id}>
                          {scorer.name} ({scorer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-success w-100"
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    Create Match
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary w-100 mt-2"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedTeams([]);
                      setOvers("");
                      setSelectedTournament("");
                      setAssignedScorer("");
                    }}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {editMatch && (
          <div
            className="modal d-block bg-dark bg-opacity-50"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content p-3">
                <h4 className="text-center">Edit Match</h4>
                <div className="mb-3">
                  <label className="form-label">Overs:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.overs || ""}
                    onChange={(e) => setEditData({ ...editData, overs: e.target.value })}
                    min="1"
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Status:</label>
                  <select
                    className="form-control"
                    value={editData.status || ""}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">Select Status</option>
                    <option value="Scheduled">Scheduled</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Batting Team:</label>
                  <select
                    className="form-control"
                    value={editData.battingTeam || ""}
                    onChange={(e) => setEditData({ ...editData, battingTeam: e.target.value })}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">Select Batting Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Bowling Team:</label>
                  <select
                    className="form-control"
                    value={editData.bowlingTeam || ""}
                    onChange={(e) => setEditData({ ...editData, bowlingTeam: e.target.value })}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">Select Bowling Team</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Runs Scored (Innings 1):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.runsScored?.innings1 || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        runsScored: { ...editData.runsScored, innings1: Number(e.target.value) },
                      })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Runs Scored (Innings 2):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.runsScored?.innings2 || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        runsScored: { ...editData.runsScored, innings2: Number(e.target.value) },
                      })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Wickets (Innings 1):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.wickets?.innings1 || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        wickets: { ...editData.wickets, innings1: Number(e.target.value) },
                      })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Wickets (Innings 2):</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.wickets?.innings2 || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        wickets: { ...editData.wickets, innings2: Number(e.target.value) },
                      })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Overs Bowled (Innings 1):</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={editData.oversBowled?.innings1 || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        oversBowled: { ...editData.oversBowled, innings1: Number(e.target.value) },
                      })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Overs Bowled (Innings 2):</label>
                  <input
                    type="number"
                    step="0.1"
                    className="form-control"
                    value={editData.oversBowled?.innings2 || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        oversBowled: { ...editData.oversBowled, innings2: Number(e.target.value) },
                      })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Target:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editData.target || ""}
                    onChange={(e) => setEditData({ ...editData, target: Number(e.target.value) })}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Assign Scorer:</label>
                  <select
                    className="form-control"
                    value={editData.assignedScorer || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, assignedScorer: e.target.value })
                    }
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">Select a Scorer (Optional)</option>
                    {scorers.map((scorer) => (
                      <option key={scorer._id} value={scorer._id}>
                        {scorer.name} ({scorer.email})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-success w-100"
                  onClick={() => handleUpdate(editMatch)}
                  disabled={userRole !== "admin"} // Disable for non-admins
                >
                  Save
                </button>
                <button
                  className="btn btn-secondary w-100 mt-2"
                  onClick={() => setEditMatch(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </AdminLayout>
  );
};

export default CreateMatch;