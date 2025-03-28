import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../index.css";
import { FaRegUserCircle } from "react-icons/fa";

function Header() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem("username"));
  const username = localStorage.getItem("username");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
  };

  return (
    <header
      className="navbar navbar-expand-lg py-3 shadow-sm sticky-top"
      style={{ backgroundColor: "#1E3A8A" }}
    >
      <div className="container">
        <Link to="/" className="navbar-brand fw-bold text-white">
          <img
            src="/cricket.png"
            alt="Cricket Live Logo"
            style={{ height: "40px", marginRight: "10px" }}
          />
          Cricket Live
        </Link>

        <div className="d-flex align-items-center ms-auto">
          <Link to="/" className="nav-link text-white mx-2">
            Home
          </Link>
          <Link to="/series" className="nav-link text-white mx-2">
            Series
          </Link>
          <Link to="/fixtures" className="nav-link text-white mx-2">
            Fixtures
          </Link>
          <Link to="/stats" className="nav-link text-white mx-2">
            Stats
          </Link>

          {isLoggedIn ? (
            <div className="dropdown">
              <button
                className="btn btn-light dropdown-toggle"
                type="button"
                id="userDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaRegUserCircle className="mb-1 mx-1" />
                {username}
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
            <Link to="/login" className="nav-link text-white mx-3">
              Login
            </Link>
          )}

          <button
            className={`btn ${darkMode ? "btn-outline-light" : "btn-outline-dark"} d-flex align-items-center mx-3`}
            onClick={toggleTheme}
          >
            <i
              className={darkMode ? "bi bi-sun-fill" : "bi bi-moon-fill"}
              style={{ fontSize: "1.2rem" }}
            ></i>
            <span className="ms-2">{darkMode ? "Light" : "Dark"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;