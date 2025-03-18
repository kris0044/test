const express = require("express");
const router = express.Router();
const umpireController = require("../controllers/umpireController");

router.get("/", umpireController.getUmpires);
router.post("/", umpireController.addUmpire);
router.put("/:id", umpireController.updateUmpire);
router.delete("/:id", umpireController.deleteUmpire);

module.exports = router;