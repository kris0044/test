import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "./AdminLayout"; // Adjust the import path as needed
import api from "../utility/axiosInterceptor.js";

const AdminPlayers = () => {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [role, setRole] = useState("");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [userRole, setUserRole] = useState(null); // Track user role
  const playersPerPage = 10;

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }
      const decoded = JSON.parse(atob(token.split(".")[1])); // Decode JWT to get role
      setUserRole(decoded.role);

      const response = await api.get("/api/players", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlayers(response.data);
    } catch (error) {
      console.error("Error fetching players:", error);
      toast.error("Error fetching players");
    }
  };

  const showToast = (message) => {
    toast.info(message, { autoClose: 3000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return showToast("Only admins can add or update players.");
    const token = localStorage.getItem("token");

    try {
      if (editingPlayer) {
        await api.put(
          `/api/players/${editingPlayer._id}`,
          { name, team, role },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Player updated successfully");
      } else {
        await api.post(
          "/api/players",
          { name, team, role },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Player added successfully");
      }
      fetchPlayers();
      resetForm();
      setShowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || "Error saving player");
    }
  };

  const handleEdit = (player) => {
    if (userRole !== "admin") return showToast("Only admins can edit players.");
    setName(player.name);
    setTeam(player.team);
    setRole(player.role);
    setEditingPlayer(player);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (userRole !== "admin") return showToast("Only admins can delete players.");
    const token = localStorage.getItem("token");

    try {
      await api.delete(`/api/players/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Player deleted successfully");
      fetchPlayers();
      setSelectedPlayers(selectedPlayers.filter((playerId) => playerId !== id));
    } catch (error) {
      showToast("Error deleting player");
    }
  };

  const handleDeleteSelected = async () => {
    if (userRole !== "admin") return showToast("Only admins can delete players.");
    if (selectedPlayers.length === 0) {
      showToast("No players selected");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      await Promise.all(
        selectedPlayers.map((id) =>
          api.delete(`/api/players/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
      showToast("Selected players deleted successfully");
      fetchPlayers();
      setSelectedPlayers([]);
    } catch (error) {
      showToast("Error deleting selected players");
    }
  };

  const handleSelectPlayer = (id) => {
    if (userRole !== "admin") return; // Disable selection for non-admins
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((playerId) => playerId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (userRole !== "admin") return; // Disable select all for non-admins
    if (e.target.checked) {
      setSelectedPlayers(currentPlayers.map((player) => player._id));
    } else {
      setSelectedPlayers([]);
    }
  };

  const resetForm = () => {
    setName("");
    setTeam("");
    setRole("");
    setEditingPlayer(null);
  };

  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastPlayer = currentPage * playersPerPage;
  const indexOfFirstPlayer = indexOfLastPlayer - playersPerPage;
  const currentPlayers = filteredPlayers.slice(indexOfFirstPlayer, indexOfLastPlayer);
  const totalPages = Math.ceil(filteredPlayers.length / playersPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    setSelectedPlayers([]);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
    setSelectedPlayers([]);
  };

  return (
    <AdminLayout>
      <ToastContainer />

      {/* Header with Search and Buttons */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="w-50">
          <input
            type="text"
            placeholder="Search Player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
          />
        </div>
        <div>
          <button
            className="btn btn-danger me-2"
            onClick={handleDeleteSelected}
            disabled={userRole !== "admin" || selectedPlayers.length === 0} // Disable for non-admins or no selection
          >
            Delete Selected
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (userRole !== "admin") return showToast("Only admins can add players.");
              resetForm();
              setShowModal(true);
            }}
            disabled={userRole !== "admin"} // Disable for non-admins
          >
            Add New Player
          </button>
        </div>
      </div>

      {/* Player Modal */}
      <div
        className={`modal fade ${showModal ? "show d-block" : ""}`}
        tabIndex="-1"
        style={{ backgroundColor: showModal ? "rgba(0,0,0,0.5)" : "transparent" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                {editingPlayer ? "Edit Player" : "Add Player"}
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
                  <label htmlFor="playerName" className="form-label">
                    Player Name
                  </label>
                  <input
                    type="text"
                    id="playerName"
                    placeholder="Player Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="teamName" className="form-label">
                    Team Name
                  </label>
                  <input
                    type="text"
                    id="teamName"
                    placeholder="Team Name"
                    value={team}
                    onChange={(e) => setTeam(e.target.value)}
                    className="form-control"
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="playerRole" className="form-label">
                    Role
                  </label>
                  <select
                    id="playerRole"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-select"
                    required
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">Select Role</option>
                    <option value="Batsman">Batsman</option>
                    <option value="Bowler">Bowler</option>
                    <option value="All-Rounder">All-Rounder</option>
                    <option value="Wicketkeeper">Wicketkeeper</option>
                  </select>
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
                  {editingPlayer ? "Update Player" : "Add Player"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Players List */}
      <h3 className="text-center">Players List</h3>
      <div className="table-responsive">
        <table className="table table-bordered table-striped text-center">
          <thead className="table-dark">
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedPlayers.length === currentPlayers.length && currentPlayers.length > 0}
                  onChange={handleSelectAll}
                  disabled={userRole !== "admin"} // Disable for non-admins
                />
              </th>
              <th>Name</th>
              <th>Team</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentPlayers.map((player) => (
              <tr key={player._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedPlayers.includes(player._id)}
                    onChange={() => handleSelectPlayer(player._id)}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </td>
                <td>{player.name}</td>
                <td>{player.team}</td>
                <td>{player.role}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleEdit(player)}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(player._id)}
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

      {/* Pagination */}
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
    </AdminLayout>
  );
};

export default AdminPlayers;