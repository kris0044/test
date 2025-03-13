// import React, { createContext, useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import axios from 'axios';

// export const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//       setLoading(false);
//       return;
//     }

//     axios
//       .get('http://localhost:5000/api/auth/protected-route', {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((response) => {
//         if (response.data && response.data.user) {
//           setUser(response.data.user);
//         } else {
//           setUser(null);
//         }
//       })
//       .catch(() => {
//         localStorage.removeItem('token');
//         setUser(null);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   const logout = () => {
//     localStorage.removeItem('token');
//     setUser(null);
//     navigate('/login');
//   };

//   return (
//     <AuthContext.Provider value={{ user, loading, logout }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };
