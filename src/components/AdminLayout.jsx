import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import "bootstrap/dist/css/bootstrap.min.css";
import { Link } from "react-router-dom";
import { FaBars } from "react-icons/fa";

const AdminLayout = ({ children }) => {
  // Set initial sidebar state based on screen size
  const navigate = useNavigate();
  const [username, setUsername] = useState("Admin");

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    return window.innerWidth >= 768; // Open by default on medium screens and up (md breakpoint)
  });

  // Update sidebar state on window resize
  useEffect(() => {
    const name = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    if (!name || role !== "admin" && role !== "scorer") {
      navigate("/");
    } else {
      setUsername(name);
    }
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize); // Cleanup
  }, []);

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div
        className="bg-dark text-white p-3 vh-100"
        style={{
          width: isSidebarOpen ? "250px" : "0px",
          overflow: "hidden",
          transition: "width 0.3s ease",
          position: "fixed", // Fix sidebar position
          top: 0,
          left: 0,
          zIndex: 1000, // Ensure sidebar is above content
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
      <div className="flex-grow-1" style={{ marginLeft: isSidebarOpen && window.innerWidth >= 768 ? "250px" : "0px" }}>
        <nav className="navbar-nav bg-dark text-white d-flex justify-content-between p-3 sticky-top">
          <button
            className="btn btn-dark d-md-none" // Visible only on mobile (below md)
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              fontSize: "1rem",
              marginRight: "94%",
              zIndex: 1001, // Above sidebar
            }}
          >
            <FaBars style={{ color: "white" }} />
          </button>
          <span className="navbar-brand me-3 ms-auto text-white">Admin</span>
        </nav>
        <div className="p-3">{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;