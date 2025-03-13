// require("dotenv").config();
// const jwt = require("jsonwebtoken");

// const authMiddleware = (req, res, next) => {
//   const authHeader = req.header("Authorization");

//   // Ensure authorization header is present and properly formatted
//   if (!authHeader || !authHeader.startsWith("Bearer ")) {
//     return res.status(401).json({ message: "Access Denied: No Token Provided or Incorrect Format" });
//   }

//   // Extract the token after "Bearer "
//   const token = authHeader.split(" ")[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // Attach user data to request
//     return next(); // Ensure next() is explicitly called
//   } catch (error) {
//     return res.status(403).json({ message: "Invalid or Expired Token" });
//   }
// };

// module.exports = authMiddleware;

require("dotenv").config();
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  console.log("Auth Header:", authHeader); // Debug

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access Denied: No Token Provided or Incorrect Format" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Extracted Token:", token); // Debug

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Payload:", decoded); // Debug
    req.user = decoded; // { id, role, iat, exp }
    console.log("req.user set to:", req.user); // Debug
    return next();
  } catch (error) {
    console.error("Token Verification Error:", error.message); // Debug
    return res.status(403).json({ message: "Invalid or Expired Token" });
  }
};

module.exports = authMiddleware;