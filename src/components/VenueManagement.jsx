import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "../components/AdminLayout"; // Adjust path as needed
import api from "../utility/axiosInterceptor.js";

const VenueManagement = () => {
  const [venues, setVenues] = useState([]);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [editingVenue, setEditingVenue] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState(null); // Track user role
  const venuesPerPage = 10;

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = JSON.parse(atob(token.split(".")[1])); // Decode JWT to get role
      setUserRole(decoded.role);

      const response = await api.get("/api/venues", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVenues(response.data || []);
    } catch (error) {
      console.error("Error fetching venues:", error);
      showToast("Error fetching venues");
    }
  };

  const showToast = (message) => {
    toast.info(message, { autoClose: 3000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return showToast("Only admins can update venues.");
    const token = localStorage.getItem("token");

    try {
      if (editingVenue) {
        await api.put(
          `/api/venues/${editingVenue._id}`,
          { name, location },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Venue updated successfully");
      } else {
        await api.post(
          "/api/venues",
          { name, location },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Venue added successfully");
      }
      fetchVenues();
      resetForm();
      setShowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || "Error saving venue");
    }
  };

  const handleEdit = (venue) => {
    if (userRole !== "admin") return showToast("Only admins can edit venues.");
    setName(venue.name);
    setLocation(venue.location);
    setEditingVenue(venue);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (userRole !== "admin") return showToast("Only admins can delete venues.");
    const token = localStorage.getItem("token");

    try {
      await api.delete(`/api/venues/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Venue deleted successfully");
      fetchVenues();
    } catch (error) {
      showToast("Error deleting venue");
    }
  };

  const resetForm = () => {
    setName("");
    setLocation("");
    setEditingVenue(null);
  };

  const filteredVenues = venues.filter(
    (venue) =>
      venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      venue.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastVenue = currentPage * venuesPerPage;
  const indexOfFirstVenue = indexOfLastVenue - venuesPerPage;
  const currentVenues = filteredVenues.slice(indexOfFirstVenue, indexOfLastVenue);
  const totalPages = Math.ceil(filteredVenues.length / venuesPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <AdminLayout>
      <ToastContainer />

      {/* Header with Search */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="w-50">
          <input
            type="text"
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
          />
        </div>
        {userRole === "admin" && (
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            Add Venue
          </button>
        )}
      </div>

      {/* Venue Modal */}
      <div
        className={`modal fade ${showModal ? "show d-block" : ""}`}
        tabIndex="-1"
        style={{ backgroundColor: showModal ? "rgba(0,0,0,0.5)" : "transparent" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingVenue ? "Edit Venue" : "Add Venue"}</h5>
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
                  <label htmlFor="venueName" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="venueName"
                    placeholder="Venue Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="venueLocation" className="form-label">
                    Location
                  </label>
                  <input
                    type="text"
                    id="venueLocation"
                    placeholder="Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"}
                  />
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
                  disabled={userRole !== "admin"}
                >
                  {editingVenue ? "Update Venue" : "Add Venue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Venues List */}
      <h3 className="text-center">Venues List</h3>
      <div className="table-responsive">
        <table className="table table-bordered table-striped text-center">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentVenues.map((venue) => (
              <tr key={venue._id}>
                <td>{venue.name}</td>
                <td>{venue.location}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleEdit(venue)}
                    disabled={userRole !== "admin"}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(venue._id)}
                    disabled={userRole !== "admin"}
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

export default VenueManagement;