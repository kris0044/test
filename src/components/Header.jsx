import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "../index.css";

function Header() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });



  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);


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