import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import api from "../utility/axiosInterceptor.js";


function Login() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/auth/login", formData);
      const { token, user } = res.data;

      // Store user details in localStorage
      localStorage.setItem("token", token);
      localStorage.setItem("username", user.name);
      localStorage.setItem("role", user.role);
      localStorage.setItem("id", user.id);
      console.log(res.data);
      alert(`Hello, ${user.name}!`);

      // Redirect based on user role
      if (user.role === "admin" || user.role === "scorer") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/home", { replace: true });
      }
    } catch (error) {
      alert(error.response?.data?.message || "Login failed, please try again.");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100">
      <div className="card p-4 shadow-lg w-100" style={{ maxWidth: "400px" }}>
        <h2 className="text-center mb-4">Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Enter your email"
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Enter your password"
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">Login</button>
        </form>
        <p className="text-center mt-3">
          Don't have an account? <a href="/register">Register</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
