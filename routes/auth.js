const express = require("express");

const {register,login,test}  = require("../controllers/Usercontroller");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Register User

router.post("/register",register);

// Login User
router.post("/login",login);
router.get("/test",authMiddleware,test)
router.get("/api/auth/protected-route", authMiddleware, (req, res) => {
  console.log("Authenticated User:", req.user); // Debugging
  res.json({ user: req.user }); // Ensure correct response
});

module.exports = router;
