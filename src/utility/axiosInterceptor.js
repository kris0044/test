// import axios from "axios";

// const api = axios.create({
//   baseURL: "http://localhost:5000",
// });

// // Request Interceptor
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// // Response Interceptor
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response && error.response.status === 403) {
//       alert("Session expired. Please log in again.");
//       localStorage.clear();
//       window.location.href = "/login"; // Redirect to login
//     }
//     return Promise.reject(error);
//   }
// );

// export default api;
import axios from "axios";
import { toast } from "react-toastify"; // Assuming you're using toast in CreateMatch.jsx

const api = axios.create({
  baseURL: "https://test-1-iryd.onrender.com/",
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    // console.log("Request URL:", config.url); // Debug URL
    // console.log("Token sent:", token); // Debug token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("Response error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
    }); // Debug full error
    if (error.response) {
      if (error.response.status === 403) {
        const errorMsg = error.response.data?.error || "Forbidden action";
        toast.error(errorMsg); // Use toast instead of alert
        if (errorMsg === "Only admins can update matches" || errorMsg === "Only admins can create matches") {
          // Stay on page, let user know they lack permission
          return Promise.reject(error);
        } else {
          // Assume session expired for other 403 cases
          toast.error("Session expired. Redirecting to login...");
          localStorage.clear();
          setTimeout(() => (window.location.href = "/login"), 2000); // Delay for toast visibility
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
