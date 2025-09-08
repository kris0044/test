const express = require("express");
const {
  createMatch,
  getMatches,
  updateMatch,
  deleteMatch,
  getMatchById,
  updateMatchState,
  getTeamMatches,
  getHeadToHeadMatches,
} = require("../Controllers/matchController");
const authMiddleware = require("../Middleware/authMiddleware"); 
const router = express.Router();


router.post("/", authMiddleware, createMatch);          
router.put("/:id", authMiddleware, updateMatch);        
router.delete("/:id", authMiddleware, deleteMatch);     


router.put("/:id/state", authMiddleware, updateMatchState); 


router.get("/", getMatches);                            
router.get("/team/:teamId", getTeamMatches);            
router.get("/head-to-head", getHeadToHeadMatches);      
router.get("/:id", getMatchById);                       

module.exports = router;