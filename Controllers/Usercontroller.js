// controllers/userController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      const users = await User.find();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server error fetching users" });
    }
  },
getScorer: async (req, res) => {
    try {const scorers = await User.find({ role: "scorer" });
    res.status(200).json(scorers);
  } catch (err) {
    res.status(500).json({ error: "Error fetching scorers" });
  }
},
  // Update a user
  updateUser: async (req, res) => {
    const { name, email, role } = req.body;
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { name, email, role },
        { new: true, runValidators: true }
      );
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  // Delete a user
  deleteUser: async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Server error deleting user" });
    }
  },

  // Register a new user
  register: async (req, res) => {
    try {
      const { name, email, password } = req.body;

      // Check if the user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new user
      const user = new User({ name, email, password: hashedPassword });
      await user.save();

      res.status(201).json({
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (error) {
      console.error("Registration Error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Login a user
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: "Invalid credentials" });

      // Compare passwords
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

      // Generate JWT token with id AND role
      const token = jwt.sign(
        { id: user._id, role: user.role }, // Ensure role is included
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      console.log("Generated token:", token); // Debug
      console.log("User data:", { id: user._id, role: user.role }); // Debug

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  test: async (req, res) => {
    res.json({ message: "Hello, World!" });
  },
};

module.exports = userController;