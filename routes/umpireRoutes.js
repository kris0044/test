const express = require("express");
const router = express.Router();
const umpireController = require("../Controllers/umpireController");
const authMiddleware = require("../Middleware/authMiddleware"); // Protect routes

router.get("/", umpireController.getUmpires);
router.post("/",authMiddleware, umpireController.addUmpire);
router.put("/:id",authMiddleware, umpireController.updateUmpire);
router.delete("/:id",authMiddleware, umpireController.deleteUmpire);

module.exports = router;