// routes/users.js
const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
// Routes
router.get("/",  userController.getAllUsers);
router.put("/:id",  userController.updateUser);
router.delete("/:id",  userController.deleteUser);
router.get("/users", authMiddleware, userController.getScorer);
module.exports = router;