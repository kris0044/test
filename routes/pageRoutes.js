const express = require("express");
const router = express.Router();
const pageController = require("../Controllers/pageController");
const auth = require("../Middleware/authMiddleware"); 
// Public routes
router.get("/", pageController.getAllPages);
router.get("/:slug", pageController.getPageBySlug);

// Admin-only routes
router.post("/", auth, pageController.createPage);
router.put("/:id",auth,  pageController.updatePage);
router.delete("/:id",auth,  pageController.deletePage);

module.exports = router;