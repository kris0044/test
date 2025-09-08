const express = require("express");
const router = express.Router();
const FixturesController = require("../Controllers/FixturesController");

router.get("/filtered", FixturesController.getFilteredFixtures.bind(FixturesController));
router.get("/load-more", FixturesController.loadMoreFixtures.bind(FixturesController));
module.exports = router;