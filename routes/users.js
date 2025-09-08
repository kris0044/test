// routes/users.js
const express = require("express");
const router = express.Router();
const userController = require("../Controllers/Usercontroller");
const authMiddleware = require("../Middleware/authMiddleware");
// Routes
router.get("/",  userController.getAllUsers);
router.put("/:id",authMiddleware,  userController.updateUser);
router.delete("/:id", authMiddleware, userController.deleteUser);
router.get("/users",  userController.getScorer);
module.exports = router;