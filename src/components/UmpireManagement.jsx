import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "../components/AdminLayout";
import api from "../utility/axiosInterceptor.js";
import Select from "react-select";
import countryList from "country-list"; // Import the default export

const UmpireManagement = () => {
  const [umpires, setUmpires] = useState([]);
  const [countries, setCountries] = useState([]); // Store country options
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("");
  const [editingUmpire, setEditingUmpire] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const umpiresPerPage = 10;

  useEffect(() => {
    // Load countries from country-list
    const countryNames = countryList.getNames(); // Use getNames() to get array of country names
    const countryOptions = countryNames
      .map((country) => ({
        value: country,
        label: country,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    setCountries(countryOptions);

    fetchUmpires();
  }, []);

  const fetchUmpires = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = JSON.parse(atob(token.split(".")[1]));
      setUserRole(decoded.role);

      const response = await api.get("/api/umpires", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUmpires(response.data || []);
    } catch (error) {
      console.error("Error fetching umpires:", error);
      showToast("Error fetching umpires");
    }
  };

  const showToast = (message) => {
    toast.info(message, { autoClose: 3000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return showToast("Only admins can update umpires.");
    const token = localStorage.getItem("token");

    try {
      if (editingUmpire) {
        await api.put(
          `/api/umpires/${editingUmpire._id}`,
          { name, nationality },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Umpire updated successfully");
      } else {
        await api.post(
          "/api/umpires",
          { name, nationality },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("Umpire added successfully");
      }
      fetchUmpires();
      resetForm();
      setShowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || "Error saving umpire");
    }
  };

  const handleEdit = (umpire) => {
    if (userRole !== "admin") return showToast("Only admins can edit umpires.");
    setName(umpire.name);
    setNationality(umpire.nationality);
    setEditingUmpire(umpire);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (userRole !== "admin") return showToast("Only admins can delete umpires.");
    const token = localStorage.getItem("token");

    try {
      await api.delete(`/api/umpires/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("Umpire deleted successfully");
      fetchUmpires();
    } catch (error) {
      showToast("Error deleting umpire");
    }
  };

  const resetForm = () => {
    setName("");
    setNationality("");
    setEditingUmpire(null);
  };

  const filteredUmpires = umpires.filter(
    (umpire) =>
      umpire.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      umpire.nationality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastUmpire = currentPage * umpiresPerPage;
  const indexOfFirstUmpire = indexOfLastUmpire - umpiresPerPage;
  const currentUmpires = filteredUmpires.slice(indexOfFirstUmpire, indexOfLastUmpire);
  const totalPages = Math.ceil(filteredUmpires.length / umpiresPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const customStyles = {
    menu: (provided) => ({
      ...provided,
      maxHeight: "150px",
      overflowY: "auto",
    }),
    control: (provided) => ({
      ...provided,
      borderColor: userRole !== "admin" ? "#ced4da" : provided.borderColor,
    }),
    singleValue: (provided) => ({
      ...provided,
      color: userRole !== "admin" ? "#6c757d" : provided.color,
    }),
  };

  return (
    <AdminLayout>
      <ToastContainer />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="w-50">
          <input
            type="text"
            placeholder="Search by name or nationality..."
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
            Add Umpire
          </button>
        )}
      </div>

      <div
        className={`modal fade ${showModal ? "show d-block" : ""}`}
        tabIndex="-1"
        style={{ backgroundColor: showModal ? "rgba(0,0,0,0.5)" : "transparent" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{editingUmpire ? "Edit Umpire" : "Add Umpire"}</h5>
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
                  <label htmlFor="umpireName" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="umpireName"
                    placeholder="Umpire Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="umpireNationality" className="form-label">
                    Nationality
                  </label>
                  <Select
                    id="umpireNationality"
                    options={countries}
                    value={countries.find((option) => option.value === nationality) || null}
                    onChange={(selectedOption) => setNationality(selectedOption ? selectedOption.value : "")}
                    placeholder="Select Nationality"
                    isSearchable={true}
                    isDisabled={userRole !== "admin"}
                    styles={customStyles}
                    required
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
                  {editingUmpire ? "Update Umpire" : "Add Umpire"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <h3 className="text-center">Umpires List</h3>
      <div className="table-responsive">
        <table className="table table-bordered table-striped text-center">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Nationality</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUmpires.map((umpire) => (
              <tr key={umpire._id}>
                <td>{umpire.name}</td>
                <td>{umpire.nationality}</td>
                <td>{new Date(umpire.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleEdit(umpire)}
                    disabled={userRole !== "admin"}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(umpire._id)}
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

export default UmpireManagement;