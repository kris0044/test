import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AdminLayout from "./AdminLayout"; // Adjust path as needed
import api from "../utility/axiosInterceptor.js";

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [userRole, setUserRole] = useState(null); // Track user role
  const usersPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const decoded = JSON.parse(atob(token.split(".")[1])); // Decode JWT to get role
      setUserRole(decoded.role);

      const response = await api.get("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      showToast("Error fetching users");
    }
  };

  const showToast = (message) => {
    toast.info(message, { autoClose: 3000 });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userRole !== "admin") return showToast("Only admins can update users.");
    const token = localStorage.getItem("token");

    try {
      if (editingUser) {
        await api.put(
          `/api/users/${editingUser._id}`,
          { name, email, role },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showToast("User updated successfully");
      }
      fetchUsers();
      resetForm();
      setShowModal(false);
    } catch (error) {
      showToast(error.response?.data?.message || "Error updating user");
    }
  };

  const handleEdit = (user) => {
    if (userRole !== "admin") return showToast("Only admins can edit users.");
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (userRole !== "admin") return showToast("Only admins can delete users.");
    const token = localStorage.getItem("token");

    try {
      await api.delete(`/api/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast("User deleted successfully");
      fetchUsers();
    } catch (error) {
      showToast("Error deleting user");
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setRole("");
    setEditingUser(null);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-control"
          />
        </div>
      </div>

      {/* User Modal */}
      <div
        className={`modal fade ${showModal ? "show d-block" : ""}`}
        tabIndex="-1"
        style={{ backgroundColor: showModal ? "rgba(0,0,0,0.5)" : "transparent" }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit User</h5>
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
                  <label htmlFor="userName" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    id="userName"
                    placeholder="User Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="userEmail" className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="userEmail"
                    placeholder="User Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-control"
                    required
                    disabled={userRole !== "admin"} // Disable for non-admins
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="userRole" className="form-label">
                    Role
                  </label>
                  <select
                    id="userRole"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="form-select"
                    required
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    <option value="">Select Role</option>
                    <option value="admin">Admin</option>
                    <option value="scorer">Scorer</option>
                    <option value="viewer">Viewer</option>
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
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Users List */}
      <h3 className="text-center">Users List</h3>
      <div className="table-responsive">
        <table className="table table-bordered table-striped text-center">
          <thead className="table-dark">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.map((user) => (
              <tr key={user._id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => handleEdit(user)}
                    disabled={userRole !== "admin"} // Disable for non-admins
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(user._id)}
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

export default AdminUsers;