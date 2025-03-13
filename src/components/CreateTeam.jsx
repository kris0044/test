import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "./AdminLayout";
import api from "../utility/axiosInterceptor.js";

const CreateTeam = () => {
  const [teamName, setTeamName] = useState("");
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [userRole, setUserRole] = useState(null); // Track user role

  const userId = localStorage.getItem("id");
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Decode JWT to get role
        if (token) {
          const decoded = JSON.parse(atob(token.split(".")[1]));
          setUserRole(decoded.role);
        }

        const playerRes = await api.get("/api/players/available");
        setPlayers(playerRes.data);

        const teamRes = await api.get(`/api/teams/user/${userId}`);
        setTeams(teamRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error fetching data");
      }
    };

    fetchData();
  }, [userId, token]);

  const handlePlayerSelect = (player) => {
    if (userRole !== "admin") return; // Disable player selection for non-admins
    if (selectedPlayers.some((p) => p._id === player._id)) {
      setSelectedPlayers(selectedPlayers.filter((p) => p._id !== player._id));
    } else {
      if (selectedPlayers.length < 11) {
        setSelectedPlayers([...selectedPlayers, player]);
      } else {
        toast.warning("You can select a maximum of 11 players!");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return toast.error("Only admins can create or update teams.");

    if (!teamName.trim()) {
      toast.error("Team name is required!");
      return;
    }

    if (selectedPlayers.length > 11) {
      toast.error("You cannot select more than 11 players!");
      return;
    }

    try {
      if (editingTeamId) {
        await api.put(
          `/api/teams/${editingTeamId}`,
          { name: teamName, players: selectedPlayers.map((p) => p._id), userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Team updated successfully!");
        setEditingTeamId(null);
      } else {
        await api.post(
          "/api/teams",
          { name: teamName, players: selectedPlayers.map((p) => p._id), id: userId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Team created successfully!");
      }

      setTeamName("");
      setSelectedPlayers([]);

      const playerRes = await api.get("/api/players/available");
      setPlayers(playerRes.data);

      const teamRes = await api.get(`/api/teams/user/${userId}`);
      setTeams(teamRes.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Error creating/updating team");
    }
  };

  const handleEdit = (team) => {
    if (userRole !== "admin") return toast.error("Only admins can edit teams.");
    setEditingTeamId(team._id);
    setTeamName(team.name);
    setSelectedPlayers(team.players); // Store player objects directly
  };

  const handleDelete = async (teamId) => {
    if (userRole !== "admin") return toast.error("Only admins can delete teams.");
    try {
      await api.delete(`/api/teams/${teamId}`, {
        data: { userId },
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Team deleted successfully!");
      setSelectedPlayers([]);

      const playerRes = await api.get("/api/players/available");
      setPlayers(playerRes.data);

      const teamRes = await api.get(`/api/teams/user/${userId}`);
      setTeams(teamRes.data);
    } catch (error) {
      toast.error("Error deleting team");
    }
  };

  return (
    <AdminLayout>
      <ToastContainer />
      <div className="card-header bg-light text-dark text-center">
        <h2>{editingTeamId ? "Update Team" : "Create a New Team"}</h2>
      </div>
      <div className="card-body">
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Team Name</label>
            <input
              type="text"
              className="form-control"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              required
              disabled={userRole !== "admin"} // Disable for non-admins
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Search Players</label>
            <input
              type="text"
              className="form-control"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for players..."
            />
          </div>

          {selectedPlayers.length > 0 && (
            <div className="mb-3">
              <h5>Selected Players</h5>
              <ul className="list-group">
                {selectedPlayers.map((player) => (
                  <li
                    key={player._id}
                    className="list-group-item d-flex justify-content-between"
                  >
                    {player.name}
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handlePlayerSelect(player)}
                      disabled={userRole !== "admin"} // Disable for non-admins
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-3">
            <h5>Available Players</h5>
            <div className="row">
              {players
                .filter((player) =>
                  player.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((player) => (
                  <div key={player._id} className="col-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={selectedPlayers.some((p) => p._id === player._id)}
                        onChange={() => handlePlayerSelect(player)}
                        disabled={userRole !== "admin"} // Disable for non-admins
                      />
                      <label className="form-check-label">{player.name}</label>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={userRole !== "admin"} // Disable for non-admins
          >
            {editingTeamId ? "Update Team" : "Create Team"}
          </button>
        </form>

        <hr />

        <h3 className="mt-4">Teams</h3>
        {teams.map((team) => (
          <div
            key={team._id}
            className="alert alert-light d-flex justify-content-between align-items-center"
          >
            <span>{team.name}</span>
            <div>
              <button
                onClick={() => handleEdit(team)}
                className="btn btn-sm btn-warning me-2"
                disabled={userRole !== "admin"} // Disable for non-admins
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(team._id)}
                className="btn btn-sm btn-danger"
                disabled={userRole !== "admin"} // Disable for non-admins
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default CreateTeam;