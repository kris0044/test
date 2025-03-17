import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "bootstrap/dist/css/bootstrap.min.css";
import AdminLayout from "./AdminLayout";
import api from "../utility/axiosInterceptor.js";

const ScoreMatch = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState([]);
  const [currentInnings, setCurrentInnings] = useState(1);
  const [battingTeam, setBattingTeam] = useState(null);
  const [bowlingTeam, setBowlingTeam] = useState(null);
  const [captains, setCaptains] = useState({});
  const [currentBatsmen, setCurrentBatsmen] = useState([null, null]);
  const [currentBowler, setCurrentBowler] = useState(null);
  const [previousBowler, setPreviousBowler] = useState(null);
  const [runsScored, setRunsScored] = useState({});
  const [wickets, setWickets] = useState({});
  const [overs, setOvers] = useState({});
  const [ballsBowled, setBallsBowled] = useState({});
  const [target, setTarget] = useState(null);
  const [winner, setWinner] = useState(null);
  const [newOverStarted, setNewOverStarted] = useState(true);
  const [editScore, setEditScore] = useState(null);
  const [selectedScores, setSelectedScores] = useState([]);
  const [dismissedBatsmen, setDismissedBatsmen] = useState({});
  const [retiredHurtPlayers, setRetiredHurtPlayers] = useState({});
  const [matchStats, setMatchStats] = useState({});
  const [wicketModal, setWicketModal] = useState(null);
  const [tossWinner, setTossWinner] = useState(null);
  const [tossChoice, setTossChoice] = useState("");

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const matchResponse = await api.get(`/api/matches/${matchId}`);
        const matchData = matchResponse.data;
        console.log("Fetched match data:", matchData);
        setMatch(matchData);

        const teamIds = matchData.teams.map((team) => team._id).join(",");
        const playersResponse = await api.get(`/api/players?teamIds=${teamIds}`);
        setPlayers(playersResponse.data);

        const scoresResponse = await api.get(`/api/scores?match=${matchId}`);
        setScores(scoresResponse.data);

        setCurrentInnings(matchData.currentInnings || 1);
        setBattingTeam(matchData.battingTeam || matchData.teams[0]);
        setBowlingTeam(matchData.bowlingTeam || matchData.teams[1]);
        setCaptains(matchData.captains || {});
        setCurrentBatsmen([
          matchData.currentBatsmen[0] || null,
          matchData.currentBatsmen[1] || null,
        ]);
        setCurrentBowler(matchData.currentBowler || null);
        setPreviousBowler(matchData.previousBowler || null);
        setTarget(matchData.target || null);
        setWinner(matchData.winner || null);
        setNewOverStarted(matchData.newOverStarted !== undefined ? matchData.newOverStarted : true);
        setTossWinner(matchData.tossWinner || null);
        setTossChoice(matchData.tossChoice || "");
        setRetiredHurtPlayers(matchData.retiredHurtPlayers || {});

        recalculateMatchState(scoresResponse.data, matchData);

        if (!matchData.runsScored || Object.keys(matchData.runsScored).length === 0) {
          initializeDynamicState(matchData, scoresResponse.data);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          toast.error("Match not found! Redirecting...");
          setTimeout(() => navigate("/"), 2000);
        } else {
          toast.error("Error loading match data");
          console.error("Fetch error:", err);
        }
      }
    };
    fetchMatchData();
  }, [matchId, navigate]);

  const updateMatchState = async (updatedState) => {
    try {
      console.log("Updating match state with:", updatedState);
      await api.put(`/api/matches/${matchId}/state`, updatedState);
    } catch (err) {
      toast.error("Error updating match state");
      console.error("Update state error:", err);
    }
  };

  const initializeDynamicState = (matchData, scoresData) => {
    const totalInnings = matchData.format === "Test" ? 4 : 2;
    let initialRunsScored = {};
    let initialWickets = {};
    let initialOvers = {};
    let initialBallsBowled = {};
    let initialDismissed = {};
    let initialRetiredHurt = {};
    let initialStats = {};

    for (let i = 1; i <= totalInnings; i++) {
      initialRunsScored[`innings${i}`] = 0;
      initialWickets[`innings${i}`] = 0;
      initialOvers[`innings${i}`] = 0.0;
      initialBallsBowled[`innings${i}`] = 0;
      initialDismissed[`innings${i}`] = [];
      initialRetiredHurt[`innings${i}`] = [];
      initialStats[`innings${i}`] = { 
        batting: {}, 
        bowling: {}, 
        fielding: {}, 
        extras: { wides: {}, noBalls: {} } 
      };
    }

    setRunsScored(initialRunsScored);
    setWickets(initialWickets);
    setOvers(initialOvers);
    setBallsBowled(initialBallsBowled);
    setDismissedBatsmen(initialDismissed);
    setRetiredHurtPlayers(initialRetiredHurt);
    setMatchStats(initialStats);

    recalculateMatchState(scoresData, matchData);

    const battingFirst = tossChoice === "bat" ? tossWinner : (tossWinner === matchData.teams[0]._id ? matchData.teams[1] : matchData.teams[0]);
    const bowlingFirst = battingFirst === matchData.teams[0] ? matchData.teams[1] : matchData.teams[0];

    const initialState = {
      currentInnings: 1,
      battingTeam: battingFirst?._id || matchData.teams[0]._id,
      bowlingTeam: bowlingFirst?._id || matchData.teams[1]._id,
      runsScored: initialRunsScored,
      wickets: initialWickets,
      oversBowled: initialOvers,
      ballsBowled: initialBallsBowled,
      dismissedBatsmen: initialDismissed,
      retiredHurtPlayers: initialRetiredHurt,
      matchStats: initialStats,
      newOverStarted: true,
      currentBatsmen: [null, null],
      currentBowler: null,
      previousBowler: null,
      tossWinner: tossWinner || null,
      tossChoice: tossChoice || "",
    };
    updateMatchState(initialState);

    setBattingTeam(battingFirst || matchData.teams[0]);
    setBowlingTeam(bowlingFirst || matchData.teams[1]);
  };

  const recalculateMatchState = (scoresData, matchData) => {
    const totalInnings = matchData.format === "Test" ? 4 : 2;
    let runs = {};
    let wickets = {};
    let overs = {};
    let balls = {};
    let dismissed = {};
    let retiredHurt = {};
    let stats = {};

    for (let i = 1; i <= totalInnings; i++) {
      runs[`innings${i}`] = 0;
      wickets[`innings${i}`] = 0;
      overs[`innings${i}`] = 0.0;
      balls[`innings${i}`] = 0;
      dismissed[`innings${i}`] = [];
      retiredHurt[`innings${i}`] = matchData.retiredHurtPlayers?.[`innings${i}`] || [];
      stats[`innings${i}`] = { 
        batting: {}, 
        bowling: {}, 
        fielding: {}, 
        extras: { wides: {}, noBalls: {} } 
      };
    }

    scoresData.forEach((score) => {
      const inningsKey = `innings${score.innings}`;
      const batsmanId = score.batsman?._id;
      const bowlerId = score.bowler?._id;

      if (batsmanId) {
        stats[inningsKey].batting[batsmanId] = stats[inningsKey].batting[batsmanId] || {
          runs: 0,
          balls: 0,
          wickets: 0,
          runsBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
        };
      }
      if (bowlerId) {
        stats[inningsKey].bowling[bowlerId] = stats[inningsKey].bowling[bowlerId] || {
          runs: 0,
          balls: 0,
          wickets: 0,
          wicketsTaken: [],
          wicketTypes: {},
        };
      }

      runs[inningsKey] += score.runs;
      if (score.wicket) {
        wickets[inningsKey]++;
        dismissed[inningsKey].push(score.outBatsman || batsmanId);
        if (bowlerId && score.wicketType !== "run out") {
          stats[inningsKey].bowling[bowlerId].wickets++;
          stats[inningsKey].bowling[bowlerId].wicketsTaken.push(score.outBatsman || batsmanId);
          stats[inningsKey].bowling[bowlerId].wicketTypes[score.wicketType] =
            (stats[inningsKey].bowling[bowlerId].wicketTypes[score.wicketType] || 0) + 1;
        }
        if (score.fielders && score.fielders.length > 0) {
          score.fielders.forEach((fielder) => {
            const fielderId = typeof fielder === "string" ? fielder : fielder._id;
            stats[inningsKey].fielding[fielderId] = stats[inningsKey].fielding[fielderId] || {
              catches: 0,
              stumpings: 0,
              runOuts: 0,
            };
            if (score.wicketType === "caught") {
              stats[inningsKey].fielding[fielderId].catches++;
            } else if (score.wicketType === "stumped") {
              stats[inningsKey].fielding[fielderId].stumpings++;
            } else if (score.wicketType === "run out") {
              stats[inningsKey].fielding[fielderId].runOuts++;
            }
          });
        }
      }

      if (score.ballType === "legal") {
        balls[inningsKey]++;
        overs[inningsKey] = Math.floor(balls[inningsKey] / 6) + ((balls[inningsKey] % 6) / 10);

        if (batsmanId) {
          stats[inningsKey].batting[batsmanId].balls++;
          stats[inningsKey].batting[batsmanId].runs += score.runs;
          if (score.runs > 0 && score.runs <= 6) {
            stats[inningsKey].batting[batsmanId].runsBreakdown[score.runs]++;
          }
        }
        if (bowlerId) {
          stats[inningsKey].bowling[bowlerId].balls++;
          stats[inningsKey].bowling[bowlerId].runs += score.runs;
        }
      }

      if (score.ballType === "wide" && bowlerId) {
        stats[inningsKey].extras.wides[bowlerId] =
          (stats[inningsKey].extras.wides[bowlerId] || 0) + score.runs;
        stats[inningsKey].bowling[bowlerId].runs += score.runs;
      }
      if (score.ballType === "noBall" && bowlerId) {
        stats[inningsKey].extras.noBalls[bowlerId] =
          (stats[inningsKey].extras.noBalls[bowlerId] || 0) + score.runs;
        stats[inningsKey].bowling[bowlerId].runs += score.runs;
        if (score.runs > 1 && batsmanId) {
          stats[inningsKey].batting[batsmanId].runs += score.runs - 1;
          if (score.runs - 1 <= 6) {
            stats[inningsKey].batting[batsmanId].runsBreakdown[score.runs - 1]++;
          }
        }
      }
    });

    setRunsScored(runs);
    setWickets(wickets);
    setOvers(overs);
    setBallsBowled(balls);
    setDismissedBatsmen(dismissed);
    setRetiredHurtPlayers(retiredHurt);
    setMatchStats(stats);
  };

  const handleScore = async (type, value, wicketType = null, fielders = [], runsOnWicket = 0, outBatsman = null) => {
    if (!currentBatsmen[0] || (!currentBowler && !newOverStarted && type !== "run out" && type !== "retiredHurt")) {
      toast.error("Select batsmen and bowler first!");
      return;
    }

    const currentOversKey = `innings${currentInnings}`;
    const currentBalls = ballsBowled[currentOversKey] || 0;
    const completedOvers = Math.floor(currentBalls / 6);
    const maxWickets = match.maxWickets || 10;

    if (completedOvers >= match.overs || wickets[currentOversKey] >= maxWickets) {
      toast.info("Innings completed. No more scoring allowed.");
      await checkInningsOrMatchEnd();
      return;
    }

    const ballsInOver = currentBalls % 6;
    const scoreEntry = {
      match: matchId,
      team: battingTeam._id,
      batsman: currentBatsmen[0]?._id,
      bowler: currentBowler?._id,
      runs: 0,
      ball: ballsInOver + 1,
      wicket: false,
      over: completedOvers + 1,
      innings: currentInnings,
      ballType: "legal",
      wicketType: null,
      fielders: [],
      runsOnWicket: 0,
      outBatsman: null,
      timestamp: new Date().toISOString(),
    };

    let isLegalDelivery = true;

    switch (type) {
      case "runs":
        scoreEntry.runs = value;
        setRunsScored((prev) => ({ ...prev, [currentOversKey]: (prev[currentOversKey] || 0) + value }));
        if (value % 2 === 1) swapEnds();
        break;
      case "wide":
        scoreEntry.runs = value ? value : 1;
        scoreEntry.ball = "wide";
        scoreEntry.ballType = "wide";
        setRunsScored((prev) => ({
          ...prev,
          [currentOversKey]: (prev[currentOversKey] || 0) + (value ? value : 1),
        }));
        isLegalDelivery = false;
        if (wicketType) {
          scoreEntry.wicket = true;
          scoreEntry.wicketType = wicketType;
          scoreEntry.fielders = fielders;
          scoreEntry.runsOnWicket = runsOnWicket;
          scoreEntry.outBatsman = outBatsman || currentBatsmen[0]?._id;
          setWickets((prev) => ({ ...prev, [currentOversKey]: (prev[currentOversKey] || 0) + 1 }));
          setDismissedBatsmen((prev) => ({
            ...prev,
            [currentOversKey]: [...(prev[currentOversKey] || []), scoreEntry.outBatsman],
          }));
          setCurrentBatsmen([null, currentBatsmen[1]]);
          if (wicketType === "run out") scoreEntry.bowler = null;
        }
        break;
      case "noBall":
        scoreEntry.runs = 1 + (value || 0);
        scoreEntry.ball = "noBall";
        scoreEntry.ballType = "noBall";
        setRunsScored((prev) => ({
          ...prev,
          [currentOversKey]: (prev[currentOversKey] || 0) + 1 + (value || 0),
        }));
        isLegalDelivery = false;
        if (wicketType) {
          scoreEntry.wicket = true;
          scoreEntry.wicketType = wicketType;
          scoreEntry.fielders = fielders;
          scoreEntry.runsOnWicket = runsOnWicket;
          scoreEntry.outBatsman = outBatsman || currentBatsmen[0]?._id;
          setWickets((prev) => ({ ...prev, [currentOversKey]: (prev[currentOversKey] || 0) + 1 }));
          setDismissedBatsmen((prev) => ({
            ...prev,
            [currentOversKey]: [...(prev[currentOversKey] || []), scoreEntry.outBatsman],
          }));
          setCurrentBatsmen([null, currentBatsmen[1]]);
          if (wicketType === "run out") scoreEntry.bowler = null;
        }
        break;
      case "wicket":
        scoreEntry.wicket = true;
        scoreEntry.wicketType = wicketType;
        scoreEntry.fielders = fielders;
        scoreEntry.runsOnWicket = runsOnWicket;
        scoreEntry.outBatsman = outBatsman || currentBatsmen[0]?._id;
        setWickets((prev) => ({ ...prev, [currentOversKey]: (prev[currentOversKey] || 0) + 1 }));
        setDismissedBatsmen((prev) => ({
          ...prev,
          [currentOversKey]: [...(prev[currentOversKey] || []), scoreEntry.outBatsman],
        }));
        setCurrentBatsmen([null, currentBatsmen[1]]);
        if (wicketType === "run out") scoreEntry.bowler = null;
        break;
      case "retiredHurt":
        setRetiredHurtPlayers((prev) => ({
          ...prev,
          [currentOversKey]: [...(prev[currentOversKey] || []), currentBatsmen[0]?._id],
        }));
        setCurrentBatsmen([null, currentBatsmen[1]]);
        break;
      default:
        break;
    }

    try {
      if (type !== "retiredHurt") {
        const response = await api.post("/api/scores", scoreEntry);
        setScores((prev) => [...prev, response.data]);

        if (isLegalDelivery) {
          setBallsBowled((prev) => {
            const newBalls = (prev[currentOversKey] || 0) + 1;
            return { ...prev, [currentOversKey]: newBalls };
          });
          setOvers((prev) => {
            const newBalls = (ballsBowled[currentOversKey] || 0) + 1;
            const newOvers = Math.floor(newBalls / 6) + ((newBalls % 6) / 10);
            return { ...prev, [currentOversKey]: newOvers };
          });

          const newBallsCount = currentBalls + 1;
          if (newBallsCount % 6 === 0) {
            setNewOverStarted(true);
            setPreviousBowler(currentBowler);
            setCurrentBowler(null);
            swapEnds();
            toast.info("Over completed.");
            if (Math.floor(newBallsCount / 6) >= match.overs || wickets[currentOversKey] >= maxWickets) {
              await checkInningsOrMatchEnd();
            }
          } else {
            setNewOverStarted(false);
          }
        }

        await checkTargetAchieved();
      }

      updateMatchState({
        currentBatsmen: [currentBatsmen[0]?._id, currentBatsmen[1]?._id],
        currentBowler: currentBowler?._id,
        previousBowler: previousBowler?._id,
        newOverStarted,
        runsScored,
        wickets,
        oversBowled: overs,
        ballsBowled,
        dismissedBatsmen,
        retiredHurtPlayers,
        matchStats,
      });
    } catch (err) {
      toast.error("Error saving score");
      console.error("Score error:", err);
    }
  };

  const handleCaptainSelection = async () => {
    if (Object.keys(captains).length !== match.teams.length) {
      toast.error("Please select captains for all teams!");
      return;
    }
    try {
      const response = await api.put(`/api/matches/${matchId}`, { captains });
      setMatch((prev) => ({ ...prev, captains: response.data.captains || captains }));
      setCaptains(response.data.captains || captains);
      toast.success("Captains selected successfully!");
    } catch (err) {
      toast.error("Error selecting captains");
      console.error("Captains error:", err);
    }
  };

  const handleTossSubmit = async () => {
    if (!tossWinner || !tossChoice) {
      toast.error("Please select both toss winner and their choice!");
      return;
    }

    try {
      const battingFirst = tossChoice === "bat" 
        ? match.teams.find(t => t._id === tossWinner) 
        : match.teams.find(t => t._id !== tossWinner);
      const bowlingFirst = battingFirst._id === match.teams[0]._id ? match.teams[1] : match.teams[0];

      const response = await api.put(`/api/matches/${matchId}`, {
        tossWinner,
        tossChoice,
        battingTeam: battingFirst._id,
        bowlingTeam: bowlingFirst._id,
        status: "Ongoing",
      });

      setBattingTeam(battingFirst);
      setBowlingTeam(bowlingFirst);
      setMatch((prev) => ({
        ...prev,
        tossWinner,
        tossChoice,
        battingTeam: battingFirst,
        bowlingTeam: bowlingFirst,
        status: "Ongoing",
      }));
      updateMatchState({
        tossWinner,
        tossChoice,
        battingTeam: battingFirst._id,
        bowlingTeam: bowlingFirst._id,
        status: "Ongoing",
      });

      toast.success(`Toss won by ${match.teams.find(t => t._id === tossWinner).name} who chose to ${tossChoice} first! Match started!`);
    } catch (err) {
      toast.error("Error saving toss decision");
      console.error("Toss error:", err);
    }
  };

  const handleWicketClick = (ballType = "legal") => {
    if (!currentBatsmen[0]) {
      toast.error("Select a striker first!");
      return;
    }
    setWicketModal({ ballType, fielders: [], runsOnWicket: 0, outBatsman: null });
  };

  const submitWicket = async () => {
    const { ballType, wicketType, fielders, runsOnWicket, outBatsman } = wicketModal;
    if (!wicketType) {
      toast.error("Select a wicket type!");
      return;
    }
    if ((wicketType === "caught" || wicketType === "stumped" || wicketType === "run out") && fielders.length === 0) {
      toast.error("Select at least one fielder for this dismissal!");
      return;
    }
    if ((wicketType === "run out" || wicketType === "caught") && !outBatsman) {
      toast.error("Select which batsman is out!");
      return;
    }

    if (ballType === "wide") {
      await handleScore("wide", null, wicketType, fielders, runsOnWicket, outBatsman);
    } else if (ballType === "noBall") {
      await handleScore("noBall", null, wicketType, fielders, runsOnWicket, outBatsman);
    } else {
      await handleScore("wicket", null, wicketType, fielders, runsOnWicket, outBatsman);
    }
    setWicketModal(null);
  };

  const swapEnds = () => {
    setCurrentBatsmen([currentBatsmen[1], currentBatsmen[0]]);
  };

  const checkInningsOrMatchEnd = async () => {
    const currentOversKey = `innings${currentInnings}`;
    const currentOvers = overs[currentOversKey];
    const currentWickets = wickets[currentOversKey];
    const totalInnings = match.format === "Test" ? 4 : 2;
    const maxWickets = match.maxWickets || 10;

    if (currentOvers >= match.overs || currentWickets >= maxWickets) {
      if (currentInnings < totalInnings) {
        const newBattingTeam = bowlingTeam;
        const newBowlingTeam = battingTeam;

        setTarget(runsScored[`innings${currentInnings}`] + 1);
        setCurrentInnings(currentInnings + 1);
        setBattingTeam(newBattingTeam);
        setBowlingTeam(newBowlingTeam);
        setCurrentBatsmen([null, null]);
        setCurrentBowler(null);
        setPreviousBowler(null);
        setNewOverStarted(true);

        toast.info(`Innings ${currentInnings} completed. Start innings ${currentInnings + 1}.`);
        updateMatchState({
          currentInnings: currentInnings + 1,
          battingTeam: newBattingTeam._id,
          bowlingTeam: newBowlingTeam._id,
          target: runsScored[`innings${currentInnings}`] + 1,
          currentBatsmen: [null, null],
          currentBowler: null,
          previousBowler: null,
          newOverStarted: true,
          retiredHurtPlayers,
        });
      } else if (!winner) {
        const winnerTeam = determineWinner();
        setWinner(winnerTeam);
        setMatch((prev) => ({ ...prev, status: "Completed" }));
        await api.put(`/api/matches/${matchId}`, {
          status: "Completed",
          winner: winnerTeam._id,
        });
        updateMatchState({ winner: winnerTeam._id, status: "Completed", retiredHurtPlayers });
        toast.success(`Match completed! Winner: ${winnerTeam.name}`);
      }
    }
  };

  const handleCompleteInnings = async () => {
    if (!window.confirm("Are you sure you want to complete this innings?")) return;
    
    const currentOversKey = `innings${currentInnings}`;
    const totalInnings = match.format === "Test" ? 4 : 2;
    
    if (currentInnings < totalInnings) {
      const newBattingTeam = bowlingTeam;
      const newBowlingTeam = battingTeam;

      setTarget(runsScored[`innings${currentInnings}`] + 1);
      setCurrentInnings(currentInnings + 1);
      setBattingTeam(newBattingTeam);
      setBowlingTeam(newBowlingTeam);
      setCurrentBatsmen([null, null]);
      setCurrentBowler(null);
      setPreviousBowler(null);
      setNewOverStarted(true);

      updateMatchState({
        currentInnings: currentInnings + 1,
        battingTeam: newBattingTeam._id,
        bowlingTeam: newBowlingTeam._id,
        target: runsScored[`innings${currentInnings}`] + 1,
        currentBatsmen: [null, null],
        currentBowler: null,
        previousBowler: null,
        newOverStarted: true,
        retiredHurtPlayers,
      });

      toast.info(`Innings ${currentInnings} completed. Starting innings ${currentInnings + 1}.`);
    } else {
      const winnerTeam = determineWinner();
      setWinner(winnerTeam);
      setMatch((prev) => ({ ...prev, status: "Completed" }));
      await api.put(`/api/matches/${matchId}`, {
        status: "Completed",
        winner: winnerTeam._id,
      });
      updateMatchState({ 
        winner: winnerTeam._id, 
        status: "Completed",
        retiredHurtPlayers,
      });
      toast.success(`Match completed! Winner: ${winnerTeam.name}`);
    }
  };

  const determineWinner = () => {
    const totalRunsTeam1 = runsScored.innings1 + (runsScored.innings3 || 0);
    const totalRunsTeam2 = runsScored.innings2 + (runsScored.innings4 || 0);
    return totalRunsTeam2 > totalRunsTeam1 ? match.teams[1] : match.teams[0];
  };

  const checkTargetAchieved = async () => {
    const currentOversKey = `innings${currentInnings}`;
    const currentWickets = wickets[currentOversKey] || 0;
    const maxWickets = match.maxWickets || 10;

    if (currentInnings === 2 && !winner && match.status === "Ongoing") {
      if (runsScored[currentOversKey] === target) {
        setMatch((prev) => ({ ...prev, status: "Completed" }));
        await api.put(`/api/matches/${matchId}`, { status: "Completed" });
        updateMatchState({ status: "Completed", retiredHurtPlayers });
        toast.info("Match tied on this ball!");
      } else if (runsScored[currentOversKey] >= target) {
        setWinner(battingTeam);
        setMatch((prev) => ({ ...prev, status: "Completed" }));
        await api.put(`/api/matches/${matchId}`, {
          status: "Completed",
          winner: battingTeam._id,
        });
        updateMatchState({ winner: battingTeam._id, status: "Completed", retiredHurtPlayers });
        toast.success(`Target achieved! Match completed! Winner: ${battingTeam.name}`);
      }
    } else if (currentInnings === 2 && (currentWickets >= maxWickets || overs[currentOversKey] >= match.overs)) {
      await checkInningsOrMatchEnd();
    }
  };

  const handleEditScore = async () => {
    try {
      await api.put(`/api/scores/${editScore._id}`, editScore);
      const scoresResponse = await api.get(`/api/scores?match=${matchId}`);
      setScores(scoresResponse.data);
      recalculateMatchState(scoresResponse.data, match);
      setEditScore(null);
      toast.success("Score updated!");
    } catch (err) {
      toast.error("Error updating score");
    }
  };

  const handleDeleteScore = async (scoreId) => {
    if (!window.confirm("Are you sure you want to delete this score?")) return;
    try {
      await api.delete(`/api/scores/${scoreId}`);
      const scoresResponse = await api.get(`/api/scores?match=${matchId}`);
      setScores(scoresResponse.data);
      recalculateMatchState(scoresResponse.data, match);
      setSelectedScores(selectedScores.filter((id) => id !== scoreId));
      toast.success("Score deleted!");
    } catch (err) {
      toast.error("Error deleting score");
    }
  };

  const handleSelectScore = (scoreId) => {
    setSelectedScores((prev) =>
      prev.includes(scoreId) ? prev.filter((id) => id !== scoreId) : [...prev, scoreId]
    );
  };

  const handleSelectAllScores = () => {
    if (selectedScores.length === scores.length) {
      setSelectedScores([]);
    } else {
      setSelectedScores(scores.map((score) => score._id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedScores.length === 0) {
      toast.error("No scores selected!");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete ${selectedScores.length} selected scores?`)) return;
    try {
      await Promise.all(selectedScores.map((id) => api.delete(`/api/scores/${id}`)));
      const scoresResponse = await api.get(`/api/scores?match=${matchId}`);
      setScores(scoresResponse.data);
      recalculateMatchState(scoresResponse.data, match);
      setSelectedScores([]);
      toast.success("Selected scores deleted!");
    } catch (err) {
      toast.error("Error deleting selected scores");
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (scores.length === 0) {
      toast.error("No scores to delete!");
      return;
    }
    if (!window.confirm("Are you sure you want to delete all scores? This will reset the match state.")) return;
    try {
      await api.delete(`/api/scores/all?match=${matchId}`);
      setScores([]);
      const resetState = {
        runsScored: { innings1: 0, innings2: 0 },
        wickets: { innings1: 0, innings2: 0 },
        oversBowled: { innings1: 0.0, innings2: 0.0 },
        ballsBowled: { innings1: 0, innings2: 0 },
        currentInnings: 1,
        target: null,
        winner: null,
        currentBatsmen: [null, null],
        currentBowler: null,
        previousBowler: null,
        newOverStarted: true,
        dismissedBatsmen: { innings1: [], innings2: [] },
        retiredHurtPlayers: { innings1: [], innings2: [] },
        matchStats: {
          innings1: { batting: {}, bowling: {}, fielding: {}, extras: { wides: {}, noBalls: {} } },
          innings2: { batting: {}, bowling: {}, fielding: {}, extras: { wides: {}, noBalls: {} } },
        },
        tossWinner: tossWinner || null,
        tossChoice: tossChoice || "",
      };
      setRunsScored(resetState.runsScored);
      setWickets(resetState.wickets);
      setOvers(resetState.oversBowled);
      setBallsBowled(resetState.ballsBowled);
      setCurrentInnings(1);
      setTarget(null);
      setWinner(null);
      setCurrentBatsmen([null, null]);
      setCurrentBowler(null);
      setPreviousBowler(null);
      setNewOverStarted(true);
      setSelectedScores([]);
      setDismissedBatsmen(resetState.dismissedBatsmen);
      setRetiredHurtPlayers(resetState.retiredHurtPlayers);
      setMatchStats(resetState.matchStats);
      updateMatchState(resetState);
      toast.success("All scores deleted! Match reset.");
    } catch (err) {
      toast.error("Error deleting all scores");
    }
  };

  const getPlayerName = (id) => {
    const player = players.find((p) => p._id === id);
    const isCaptain = Object.values(captains).includes(id);
    return player ? `${player.name}${isCaptain ? " (C)" : ""}` : "Unknown";
  };

  const calculateExtras = (innings) => {
    const inningsKey = `innings${innings}`;
    const wides = Object.values(matchStats[inningsKey]?.extras.wides || {}).reduce((sum, val) => sum + val, 0);
    const noBalls = Object.values(matchStats[inningsKey]?.extras.noBalls || {}).reduce((sum, val) => sum + val, 0);
    return wides + noBalls;
  };

  if (!match) return <div className="text-center mt-5">Loading...</div>;

  return (
    <AdminLayout>
      <div className="container mt-5 score-match-container">
        <h2 className="text-center mb-4 match-title">
          {match.teams?.map((t) => t.name).join(" vs ") || "Match Loading..."}
        </h2>
        <button className="btn btn-secondary mb-3" onClick={() => navigate("/creatematch")}>
          Back to Matches
        </button>

        <div className="card mb-4 match-status-card">
          <div className="card-body">
            <h4 className="card-title">Match Status</h4>
            <p><strong>Status:</strong> {match.status}</p>
            <p><strong>Innings:</strong> {currentInnings}</p>
            <p><strong>Batting:</strong> {battingTeam?.name || "N/A"}</p>
            <p><strong>Bowling:</strong> {bowlingTeam?.name || "N/A"}</p>
            <p>
              <strong>Score:</strong> {runsScored[`innings${currentInnings}`] || 0}/
              {wickets[`innings${currentInnings}`] || 0} (
              {Math.floor(overs[`innings${currentInnings}`] || 0)}.
              {Math.round((overs[`innings${currentInnings}`] % 1 || 0) * 10)}/{match.overs || "N/A"})
            </p>
            <p><strong>Extras:</strong> {calculateExtras(currentInnings)}</p>
            <p><strong>Toss:</strong> {tossWinner ? `${match.teams.find(t => t._id === tossWinner)?.name} won and chose to ${tossChoice}` : "Not decided"}</p>
            {currentInnings > 1 && (
              <p>
                <strong>Target:</strong> {target || "N/A"} (Need{" "}
                {target - (runsScored[`innings${currentInnings}`] || 0)} runs)
              </p>
            )}
            {winner && <p><strong>Winner:</strong> {winner.name}</p>}
          </div>
        </div>

        {match.status === "Scheduled" && Object.keys(captains).length < match.teams.length && (
          <div className="card mb-4">
            <div className="card-body">
              <h4 className="card-title">Select Captains</h4>
              <div className="row">
                {match.teams.map((team) => (
                  <div key={team._id} className="col-md-6 mb-3">
                    <label className="form-label">{team.name} Captain:</label>
                    <select
                      className="form-control"
                      value={captains[team._id] || ""}
                      onChange={(e) =>
                        setCaptains((prev) => ({ ...prev, [team._id]: e.target.value }))
                      }
                    >
                      <option value="">Select Captain</option>
                      {players
                        .filter((player) => player.team === team.name)
                        .map((player) => (
                          <option key={player._id} value={player._id}>
                            {getPlayerName(player._id)}
                          </option>
                        ))}
                    </select>
                  </div>
                ))}
              </div>
              <button className="btn btn-success w-100" onClick={handleCaptainSelection}>
                Submit Captains
              </button>
            </div>
          </div>
        )}

        {match.status === "Scheduled" && Object.keys(captains).length === match.teams.length && (
          <div className="card mb-4">
            <div className="card-body">
              <h4 className="card-title">Toss Decision</h4>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Toss Winner:</label>
                  <select
                    className="form-control"
                    value={tossWinner || ""}
                    onChange={(e) => {
                      const newTossWinner = e.target.value;
                      setTossWinner(newTossWinner);
                      setTossChoice("");
                    }}
                    disabled={!!tossWinner && !!tossChoice}
                  >
                    <option value="">Select Toss Winner</option>
                    {match.teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Toss Choice:</label>
                  <select
                    className="form-control"
                    value={tossChoice}
                    onChange={(e) => setTossChoice(e.target.value)}
                    disabled={!tossWinner}
                  >
                    <option value="">Select Choice</option>
                    <option value="bat">Bat First</option>
                    <option value="bowl">Bowl First</option>
                  </select>
                </div>
              </div>
              <button
                className="btn btn-primary w-100"
                onClick={handleTossSubmit}
                disabled={!tossWinner || !tossChoice}
              >
                Submit Toss Decision & Start Match
              </button>
            </div>
          </div>
        )}

        {match.status === "Ongoing" && battingTeam && bowlingTeam && (
          <>
            <div className="card mb-4">
              <div className="card-body">
                <h4 className="card-title">Current Players</h4>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Striker:</label>
                    <select
                      className="form-control"
                      value={currentBatsmen[0]?._id || ""}
                      onChange={(e) => {
                        const newBatsman = players.find((p) => p._id === e.target.value);
                        setCurrentBatsmen([newBatsman, currentBatsmen[1]]);
                        updateMatchState({
                          currentBatsmen: [newBatsman?._id, currentBatsmen[1]?._id],
                        });
                      }}
                      disabled={
                        wickets[`innings${currentInnings}`] >= (match.maxWickets || 10) ||
                        match.status === "Completed"
                      }
                    >
                      <option value="">Select Striker</option>
                      {players
                        .filter(
                          (p) =>
                            p.team === battingTeam.name &&
                            !dismissedBatsmen[`innings${currentInnings}`].includes(p._id)
                        )
                        .map((player) => (
                          <option key={player._id} value={player._id}>
                            {getPlayerName(player._id)}
                            {retiredHurtPlayers[`innings${currentInnings}`]?.includes(player._id) ? " (Retired Hurt)" : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Non-Striker:</label>
                    <select
                      className="form-control"
                      value={currentBatsmen[1]?._id || ""}
                      onChange={(e) => {
                        const newBatsman = players.find((p) => p._id === e.target.value);
                        setCurrentBatsmen([currentBatsmen[0], newBatsman]);
                        updateMatchState({
                          currentBatsmen: [currentBatsmen[0]?._id, newBatsman?._id],
                        });
                      }}
                      disabled={
                        wickets[`innings${currentInnings}`] >= (match.maxWickets || 10) ||
                        match.status === "Completed"
                      }
                    >
                      <option value="">Select Non-Striker</option>
                      {players
                        .filter(
                          (p) =>
                            p.team === battingTeam.name &&
                            !dismissedBatsmen[`innings${currentInnings}`].includes(p._id) &&
                            p._id !== currentBatsmen[0]?._id
                        )
                        .map((player) => (
                          <option key={player._id} value={player._id}>
                            {getPlayerName(player._id)}
                            {retiredHurtPlayers[`innings${currentInnings}`]?.includes(player._id) ? " (Retired Hurt)" : ""}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Bowler:</label>
                    <select
                      className="form-control"
                      value={currentBowler?._id || ""}
                      onChange={(e) => {
                        const newBowler = players.find((p) => p._id === e.target.value);
                        if (newOverStarted && newBowler?._id === previousBowler?._id) {
                          toast.error("Same bowler cannot bowl consecutive overs!");
                          return;
                        }
                        setCurrentBowler(newBowler);
                        setNewOverStarted(false);
                        updateMatchState({ currentBowler: newBowler?._id, newOverStarted: false });
                      }}
                      disabled={
                        match.status === "Completed" ||
                        (overs[`innings${currentInnings}`] >= match.overs && currentInnings === 1)
                      }
                    >
                      <option value="">Select Bowler</option>
                      {players
                        .filter((p) => p.team === bowlingTeam.name)
                        .map((player) => (
                          <option key={player._id} value={player._id}>
                            {getPlayerName(player._id)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-body">
                <h4 className="card-title">Score Ball - Innings {currentInnings}</h4>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {[0, 1, 2, 3, 4, 6].map((run) => (
                    <button
                      key={`run-${run}`}
                      className="btn btn-primary score-btn"
                      onClick={() => handleScore("runs", run)}
                      disabled={!currentBatsmen[0] || !currentBowler || match.status === "Completed"}
                    >
                      {run}
                    </button>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button
                    className="btn btn-warning score-btn"
                    onClick={() => handleScore("wide")}
                    disabled={match.status === "Completed"}
                  >
                    Wide
                  </button>
                  <button
                    className="btn btn-warning score-btn"
                    onClick={() => handleWicketClick("wide")}
                    disabled={match.status === "Completed"}
                  >
                    Wide + Wicket
                  </button>
                  {[1, 2, 3, 4, 5, 6].map((extra) => (
                    <button
                      key={`wide-${extra}`}
                      className="btn btn-warning score-btn"
                      onClick={() => handleScore("wide", extra)}
                      disabled={match.status === "Completed"}
                    >
                      Wide+{extra}
                    </button>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button
                    className="btn btn-danger score-btn"
                    onClick={() => handleScore("noBall", 0)}
                    disabled={match.status === "Completed"}
                  >
                    No Ball
                  </button>
                  <button
                    className="btn btn-danger score-btn"
                    onClick={() => handleWicketClick("noBall")}
                    disabled={match.status === "Completed"}
                  >
                    No Ball + Wicket
                  </button>
                  {[1, 2, 3, 4, 5, 6].map((extra) => (
                    <button
                      key={`noBall-${extra}`}
                      className="btn btn-danger score-btn"
                      onClick={() => handleScore("noBall", extra)}
                      disabled={match.status === "Completed"}
                    >
                      No Ball+{extra}
                    </button>
                  ))}
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    className="btn btn-danger score-btn"
                    onClick={() => handleWicketClick()}
                    disabled={!currentBatsmen[0] || !currentBowler || match.status === "Completed"}
                  >
                    Wicket
                  </button>
                  <button
                    className="btn btn-info score-btn"
                    onClick={() => handleScore("retiredHurt")}
                    disabled={!currentBatsmen[0] || match.status === "Completed"}
                  >
                    Retired Hurt
                  </button>
                  <button
                    className="btn btn-warning score-btn"
                    onClick={handleCompleteInnings}
                    disabled={match.status === "Completed"}
                  >
                    Complete Innings
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="card mb-4">
          <div className="card-body">
            <h4 className="card-title">Score Summary</h4>
            <div className="d-flex justify-content-between mb-3">
              <div>
                <input
                  type="checkbox"
                  checked={selectedScores.length === scores.length && scores.length > 0}
                  onChange={handleSelectAllScores}
                />
                <label className="ms-2">Select All</label>
              </div>
              <div>
                <button className="btn btn-danger me-2" onClick={handleDeleteSelected}>
                  Delete Selected
                </button>
                <button className="btn btn-danger" onClick={handleDeleteAll}>
                  Delete All Scores
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="table table-striped table-bordered">
                <thead className="table-dark">
                  <tr>
                    <th>Select</th>
                    <th>Innings</th>
                    <th>Team</th>
                    <th>Batsman</th>
                    <th>Bowler</th>
                    <th>Runs</th>
                    <th>Ball</th>
                    <th>Wicket</th>
                    <th>Wicket Type</th>
                    <th>Runs on Wicket</th>
                    <th>Out Batsman</th>
                    <th>Fielders</th>
                    <th>Over</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.length > 0 ? (
                    scores.map((score) => (
                      <tr key={score._id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedScores.includes(score._id)}
                            onChange={() => handleSelectScore(score._id)}
                          />
                        </td>
                        <td>{score.innings}</td>
                        <td>{score.team?.name || "N/A"}</td>
                        <td>{score.batsman?.name || "N/A"}</td>
                        <td>{score.bowler?.name || "N/A"}</td>
                        <td>{score.runs}</td>
                        <td>{score.ball}</td>
                        <td>{score.wicket ? "Yes" : "No"}</td>
                        <td>{score.wicketType || "-"}</td>
                        <td>{score.runsOnWicket || "-"}</td>
                        <td>{score.outBatsman ? getPlayerName(score.outBatsman) : "-"}</td>
                        <td>
                          {score.fielders?.map((f) => (typeof f === "string" ? getPlayerName(f) : f.name)).join(", ") || "-"}
                        </td>
                        <td>{score.over}</td>
                        <td>{new Date(score.timestamp).toLocaleTimeString()}</td>
                        <td>
                          <button
                            className="btn btn-warning btn-sm me-2"
                            onClick={() => setEditScore({ ...score })}
                          >
                            ✏
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteScore(score._id)}
                          >
                            ❌
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="15" className="text-center">
                        No scores recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <h4 className="card-title">Player Statistics</h4>
            <div className="row">
              {Array.from({ length: match.format === "Test" ? 4 : 2 }, (_, i) => i + 1).map(
                (inning) => (
                  <div key={inning} className="col-md-6 mb-4">
                    <h5>Innings {inning} - {(inning === 1 ? battingTeam : bowlingTeam)?.name || match.teams[(inning - 1) % 2]?.name || "N/A"}</h5>
                    <div className="table-responsive mb-3">
                      <table className="table table-bordered">
                        <tbody>
                          <tr>
                            <td><strong>Total</strong></td>
                            <td>
                              {runsScored[`innings${inning}`] || 0}/
                              {wickets[`innings${inning}`] || 0}
                            </td>
                            <td>
                              ({Math.floor(overs[`innings${inning}`] || 0)}.
                              {Math.round((overs[`innings${inning}`] % 1 || 0) * 10)} overs)
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Extras</strong></td>
                            <td>{calculateExtras(inning)}</td>
                            <td>
                              (Wides:{" "}
                              {Object.values(
                                matchStats[`innings${inning}`]?.extras.wides || {}
                              ).reduce((sum, val) => sum + val, 0)}
                              , No Balls:{" "}
                              {Object.values(
                                matchStats[`innings${inning}`]?.extras.noBalls || {}
                              ).reduce((sum, val) => sum + val, 0)}
                              )
                            </td>
                          </tr>
                          <tr>
                            <td><strong>Retired Hurt</strong></td>
                            <td colSpan="2">
                              {retiredHurtPlayers[`innings${inning}`]?.map(id => getPlayerName(id)).join(", ") || "None"}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h6>Batting ({(inning === 1 ? battingTeam : bowlingTeam)?.name || match.teams[(inning - 1) % 2]?.name || "N/A"})</h6>
                    <div className="table-responsive mb-3">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Runs</th>
                            <th>Balls</th>
                            <th>1s</th>
                            <th>2s</th>
                            <th>3s</th>
                            <th>4s</th>
                            <th>5s</th>
                            <th>6s</th>
                            <th>SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(matchStats[`innings${inning}`]?.batting || {}).length > 0 ? (
                            Object.entries(matchStats[`innings${inning}`].batting).map(
                              ([id, stats]) => (
                                <tr key={`inning${inning}-batting-${id}`}>
                                  <td>{getPlayerName(id)}</td>
                                  <td>{stats.runs}</td>
                                  <td>{stats.balls}</td>
                                  <td>{stats.runsBreakdown[1]}</td>
                                  <td>{stats.runsBreakdown[2]}</td>
                                  <td>{stats.runsBreakdown[3]}</td>
                                  <td>{stats.runsBreakdown[4]}</td>
                                  <td>{stats.runsBreakdown[5]}</td>
                                  <td>{stats.runsBreakdown[6]}</td>
                                  <td>
                                    {stats.balls > 0
                                      ? ((stats.runs / stats.balls) * 100).toFixed(2)
                                      : "0.00"}
                                  </td>
                                </tr>
                              )
                            )
                          ) : (
                            <tr>
                              <td colSpan="10">No batting stats yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <h6>Bowling ({(inning === 1 ? bowlingTeam : battingTeam)?.name || match.teams[inning % 2]?.name || "N/A"})</h6>
                    <div className="table-responsive mb-3">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Overs</th>
                            <th>Runs</th>
                            <th>Wickets</th>
                            <th>Bowled</th>
                            <th>Caught</th>
                            <th>Stumped</th>
                            <th>Extras</th>
                            <th>Wides</th>
                            <th>No Balls</th>
                            <th>Wickets Taken</th>
                            <th>Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(matchStats[`innings${inning}`]?.bowling || {}).length > 0 ? (
                            Object.entries(matchStats[`innings${inning}`].bowling).map(
                              ([id, stats]) => (
                                <tr key={`inning${inning}-bowling-${id}`}>
                                  <td>{getPlayerName(id)}</td>
                                  <td>{(stats.balls / 6).toFixed(1)}</td>
                                  <td>{stats.runs}</td>
                                  <td>{stats.wickets}</td>
                                  <td>{stats.wicketTypes?.bowled || 0}</td>
                                  <td>{stats.wicketTypes?.caught || 0}</td>
                                  <td>{stats.wicketTypes?.stumped || 0}</td>
                                  <td>
                                    {(matchStats[`innings${inning}`].extras.wides[id] || 0) +
                                      (matchStats[`innings${inning}`].extras.noBalls[id] || 0)}
                                  </td>
                                  <td>{matchStats[`innings${inning}`].extras.wides[id] || 0}</td>
                                  <td>{matchStats[`innings${inning}`].extras.noBalls[id] || 0}</td>
                                  <td>
                                    {stats.wicketsTaken.map((w) => getPlayerName(w)).join(", ") || "-"}
                                  </td>
                                  <td>
                                    {stats.balls > 0
                                      ? (stats.runs / (stats.balls / 6)).toFixed(2)
                                      : "0.00"}
                                  </td>
                                </tr>
                              )
                            )
                          ) : (
                            <tr>
                              <td colSpan="12">No bowling stats yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <h6>Fielding ({(inning === 1 ? bowlingTeam : battingTeam)?.name || match.teams[inning % 2]?.name || "N/A"})</h6>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Player</th>
                            <th>Catches</th>
                            <th>Stumpings</th>
                            <th>Run Outs</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(matchStats[`innings${inning}`]?.fielding || {}).length > 0 ? (
                            Object.entries(matchStats[`innings${inning}`].fielding).map(
                              ([id, stats]) => (
                                <tr key={`inning${inning}-fielding-${id}`}>
                                  <td>{getPlayerName(id)}</td>
                                  <td>{stats.catches}</td>
                                  <td>{stats.stumpings}</td>
                                  <td>{stats.runOuts}</td>
                                </tr>
                              )
                            )
                          ) : (
                            <tr>
                              <td colSpan="4">No fielding stats yet</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {wicketModal && (
          <div className="modal d-block bg-dark bg-opacity-50" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content p-3">
                <h4 className="text-center">Record Wicket</h4>
                <div className="mb-3">
                  <label className="form-label">Wicket Type:</label>
                  <select
                    className="form-control"
                    value={wicketModal.wicketType || ""}
                    onChange={(e) => setWicketModal({ ...wicketModal, wicketType: e.target.value })}
                  >
                    <option value="">Select Wicket Type</option>
                    {wicketModal.ballType === "noBall" ? (
                      <>
                        <option value="run out">Run Out</option>
                        <option value="stumped">Stumped</option>
                      </>
                    ) : (
                      <>
                        <option value="bowled">Bowled</option>
                        <option value="caught">Caught</option>
                        <option value="stumped">Stumped</option>
                        <option value="run out">Run Out</option>
                      </>
                    )}
                  </select>
                </div>
                {(wicketModal.wicketType === "caught" || wicketModal.wicketType === "run out") && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Which Batsman is Out:</label>
                      <select
                        className="form-control"
                        value={wicketModal.outBatsman || ""}
                        onChange={(e) =>
                          setWicketModal({ ...wicketModal, outBatsman: e.target.value })
                        }
                      >
                        <option value="">Select Batsman</option>
                        {currentBatsmen.map((batsman, index) => (
                          batsman && (
                            <option key={batsman._id} value={batsman._id}>
                              {getPlayerName(batsman._id)} ({index === 0 ? "Striker" : "Non-Striker"})
                            </option>
                          )
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Runs Scored During Wicket:</label>
                      <input
                        type="number"
                        className="form-control"
                        value={wicketModal.runsOnWicket}
                        onChange={(e) =>
                          setWicketModal({ ...wicketModal, runsOnWicket: parseInt(e.target.value) || 0 })
                        }
                        min="0"
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Next Striker:</label>
                      <select
                        className="form-control"
                        value={currentBatsmen[0]?._id || ""}
                        onChange={(e) => {
                          const newBatsman = players.find((p) => p._id === e.target.value);
                          setCurrentBatsmen([newBatsman, currentBatsmen[1]]);
                        }}
                      >
                        <option value="">Select Next Striker</option>
                        {players
                          .filter(
                            (p) =>
                              p.team === battingTeam.name &&
                              !dismissedBatsmen[`innings${currentInnings}`].includes(p._id) &&
                              p._id !== currentBatsmen[1]?._id
                          )
                          .map((player) => (
                            <option key={player._id} value={player._id}>
                              {getPlayerName(player._id)}
                              {retiredHurtPlayers[`innings${currentInnings}`]?.includes(player._id) ? " (Retired Hurt)" : ""}
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}
                {(wicketModal.wicketType === "caught" || wicketModal.wicketType === "stumped" || wicketModal.wicketType === "run out") && (
                  <div className="mb-3">
                    <label className="form-label">Fielders:</label>
                    <select
                      multiple
                      className="form-control"
                      value={wicketModal.fielders}
                      onChange={(e) =>
                        setWicketModal({
                          ...wicketModal,
                          fielders: Array.from(e.target.selectedOptions, (option) => option.value),
                        })
                      }
                    >
                      {players
                        .filter((p) => p.team === bowlingTeam.name)
                        .map((player) => (
                          <option key={player._id} value={player._id}>
                            {getPlayerName(player._id)}
                          </option>
                        ))}
                    </select>
                    <small className="form-text text-muted">
                      Hold Ctrl/Cmd to select multiple fielders (e.g., for run out).
                    </small>
                  </div>
                )}
                <button className="btn btn-success w-100" onClick={submitWicket}>
                  Save Wicket
                </button>
                <button
                  className="btn btn-secondary w-100 mt-2"
                  onClick={() => setWicketModal(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {editScore && (
          <div className="modal d-block bg-dark bg-opacity-50" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content p-3">
                <h4 className="text-center">Edit Score</h4>
                <div className="mb-3">
                  <label className="form-label">Runs:</label>
                  <input
                    type="number"
                    className="form-control"
                    value={editScore.runs}
                    onChange={(e) =>
                      setEditScore({ ...editScore, runs: parseInt(e.target.value) })
                    }
                    min="0"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Wicket:</label>
                  <input
                    type="checkbox"
                    className="form-check-input ms-2"
                    checked={editScore.wicket}
                    onChange={(e) => setEditScore({ ...editScore, wicket: e.target.checked })}
                  />
                </div>
                {editScore.wicket && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Wicket Type:</label>
                      <select
                        className="form-control"
                        value={editScore.wicketType || ""}
                        onChange={(e) =>
                          setEditScore({ ...editScore, wicketType: e.target.value })
                        }
                      >
                        <option value="">Select Wicket Type</option>
                        <option value="bowled">Bowled</option>
                        <option value="caught">Caught</option>
                        <option value="stumped">Stumped</option>
                        <option value="run out">Run Out</option>
                      </select>
                    </div>
                    {(editScore.wicketType === "caught" || editScore.wicketType === "run out") && (
                      <>
                        <div className="mb-3">
                          <label className="form-label">Out Batsman:</label>
                          <input
                            type="text"
                            className="form-control"
                            value={editScore.outBatsman ? getPlayerName(editScore.outBatsman) : ""}
                            disabled
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Runs on Wicket:</label>
                          <input
                            type="number"
                            className="form-control"
                            value={editScore.runsOnWicket || 0}
                            onChange={(e) =>
                              setEditScore({ ...editScore, runsOnWicket: parseInt(e.target.value) || 0 })
                            }
                            min="0"
                          />
                        </div>
                      </>
                    )}
                    {(editScore.wicketType === "caught" || editScore.wicketType === "stumped" || editScore.wicketType === "run out") && (
                      <div className="mb-3">
                        <label className="form-label">Fielders:</label>
                        <select
                          multiple
                          className="form-control"
                          value={editScore.fielders || []}
                          onChange={(e) =>
                            setEditScore({
                              ...editScore,
                              fielders: Array.from(e.target.selectedOptions, (option) => option.value),
                            })
                          }
                        >
                          {players
                            .filter((p) => p.team === bowlingTeam.name)
                            .map((player) => (
                              <option key={player._id} value={player._id}>
                                {getPlayerName(player._id)}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </>
                )}
                <button className="btn btn-success w-100" onClick={handleEditScore}>
                  Save
                </button>
                <button
                  className="btn btn-secondary w-100 mt-2"
                  onClick={() => setEditScore(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer />
      </div>
    </AdminLayout>
  );
};

export default ScoreMatch;