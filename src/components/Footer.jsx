// src/components/Footer.jsx
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import { FaTwitter, FaInstagram, FaFacebook } from "react-icons/fa"; // Social media icons

function Footer() {
  return (
    <footer className="py-3" style={{ backgroundColor: "var(--header-bg)" }}>
      <div className="container">
        {/* First Row: Logo (Left) and Social Media Icons (Right) */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          {/* Left: Logo */}
          <Link to="/" className="navbar-brand fw-bold" style={{ color: "var(--header-text)" }}>
            <img
              src="/cricket.png"
              alt="Cricket Live Logo"
              style={{ height: "30px", marginRight: "10px" }}
            />
            Cricket Live
          </Link>

          {/* Right: Social Media Icons */}
          <div className="d-flex">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="mx-2">
              <FaTwitter size={20} style={{ color: "var(--header-text)" }} className="footer-social-icon" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="mx-2">
              <FaInstagram size={20} style={{ color: "var(--header-text)" }} className="footer-social-icon" />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="mx-2">
              <FaFacebook size={20} style={{ color: "var(--header-text)" }} className="footer-social-icon" />
            </a>
          </div>
        </div>

        {/* Second Row: Tagline (Left) and Copyright (Right) */}
        <div className="d-flex justify-content-between align-items-center">
          {/* Left: Tagline */}
          <p className="small mb-0 text-muted" style={{ color: "var(--header-text)" }}>
            Your Ultimate Cricket Companion
          </p>

          {/* Right: Copyright Notice */}
          <p className="small mb-0" style={{ color: "var(--header-text)" }}>
            © 2025 Cricket Live. All Rights Reserved.
          </p>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          {/* Left: Tagline */}
          <Link to="page/about-us" className="navbar-brand " style={{ color: "var(--header-text)" }}>
       about us
          </Link>
           <Link to="login" className="navbar-brand " style={{ color: "var(--header-text)" }}>
       logs
          </Link>

          {/* Right: Copyright Notice */}
          <Link to="/page/contact-us" className="navbar-brand " style={{ color: "var(--header-text)" }}>
       contact us
          </Link>
        </div>

        <div className="d-flex justify-content-between align-items-center">
          {/* Left: Tagline */}
          <Link to="/page/terms-and-conditions" className="navbar-brand " style={{ color: "var(--header-text)" }}>
       terms and conditions
          </Link>

          {/* Right: Copyright Notice */}
          <Link to="/page/privacy-policy" className="navbar-brand " style={{ color: "var(--header-text)" }}>
       privacy policy
          </Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;