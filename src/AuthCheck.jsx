import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import jwtDecode from "jwt-decode";

const AuthCheck = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          const decoded = jwtDecode(token);
          const currentTime = Date.now() / 1000; // Convert to seconds

          if (decoded.exp < currentTime) {
            // Token expired, remove it and redirect to login
            localStorage.removeItem("token");
            alert("Session expired. Please log in again.");
            navigate("/login");
          }
        } catch (error) {
          console.error("Error decoding token:", error);
          localStorage.removeItem("token");
          navigate("/login");
        }
      }
    };

    // Run the check every second
    const interval = setInterval(checkTokenExpiration, 1000);

    return () => clearInterval(interval); // Cleanup when component unmounts
  }, [navigate]);

  return <>{children}</>;
};

export default AuthCheck;
