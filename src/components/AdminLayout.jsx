import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaBars } from "react-icons/fa";
import { FaRegUserCircle } from "react-icons/fa";

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth >= 768; // Open by default on medium screens and up (md breakpoint)
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Update sidebar state and user validation on mount and resize
  useEffect(() => {
    const name = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    // Check if user is logged in and has correct role
    if (!name || (role !== "admin" && role !== "scorer")) {
      setIsLoggedIn(false);
      navigate("/"); // Redirect to login/home if not authorized
    } else {
      setIsLoggedIn(true);
      setUsername(name); // Set the logged-in user's name
    }

    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize); // Cleanup
  }, [navigate]);

  // Handle logout
  const handleLogout = () => {
    localStorage.clear(); // Clear all localStorage data
    setIsLoggedIn(false);
    navigate("/"); // Redirect to login/home page
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div
        className="bg-dark text-white p-3 vh-100"
        style={{
          width: isSidebarOpen ? "250px" : "0px",
          overflow: "hidden",
          transition: "width 0.3s ease",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 1000,
        }}
      >
        <h5 className="text-center">Admin Panel</h5>
        <ul className="nav flex-column">
          <li className="nav-item">
            <Link to="/dashboard" className="nav-link text-white">Dashboard</Link>
          </li>
          <li className="nav-item">
            <Link to="/users" className="nav-link text-white">Users</Link>
          </li>
          <li className="nav-item">
            <Link to="/CreateMatch" className="nav-link text-white">Matches</Link>
          </li>
          <li className="nav-item">
            <Link to="/AdminTournaments" className="nav-link text-white">Tournaments</Link>
          </li>
          <li className="nav-item">
            <Link to="/CreateTeam" className="nav-link text-white">Teams</Link>
          </li>
          <li className="nav-item">
            <Link to="/AdminPlayers" className="nav-link text-white">Players</Link>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div
        className="flex-grow-1"
        style={{ marginLeft: isSidebarOpen && window.innerWidth >= 768 ? "250px" : "0px" }}
      >
        <nav
          className="navbar bg-dark text-white p-3 sticky-top"
          style={{ backgroundColor: "#343a40" }} // Fallback to ensure dark background
        >
          <div className="container-fluid d-flex justify-content-between align-items-center">
            {/* Hamburger Menu for Mobile */}
            <button
              className="btn btn-dark d-md-none"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{
                fontSize: "1rem",
                zIndex: 1001,
              }}
            >
              <FaBars style={{ color: "white" }} />
            </button>

            {/* Right-aligned User Dropdown */}
            <div className="ms-auto">
              {isLoggedIn ? (
                <div className="dropdown">
                  <button
                    className="btn btn-dark dropdown-toggle"
                    type="button"
                    id="userDropdown"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <FaRegUserCircle className="mb-1 mx-1" />
                    {username || "User"}
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>
                        Logout
                      </button>
                    </li>
                  </ul>
                </div>
              ) : (
                <Link to="/login" className="nav-link text-white">Login</Link>
              )}
            </div>
          </div>
        </nav>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;