import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.min.css";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Header from "./Header";
import MatchCard from "./MatchCard";
import api from "../utility/axiosInterceptor.js";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import Footer from "./Footer";

const socket = io(api.defaults.baseURL, {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ["websocket"],
  forceNew: false,
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Custom Arrow Components
const PrevArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <div className={className} onClick={onClick}>
      <FaArrowLeft size={30} color="#007bff" />
    </div>
  );
};

const NextArrow = (props) => {
  const { className, style, onClick } = props;
  return (
    <div className={className} onClick={onClick}>
      <FaArrowRight size={30} color="#007bff" />
    </div>
  );
};

function Home() {
  const [matches, setMatches] = useState([]);
  const [scores, setScores] = useState({});
  const [visibleRows, setVisibleRows] = useState(2);

  const fetchMatchesAndScores = useCallback(async () => {
    try {
      const response = await api.get("/api/matches", {
        params: { populate: "teams winner venue currentBatsmen currentBowler" },
      });
      const matchesData = response.data || [];
      setMatches(matchesData);

      const scoresData = {};
      await Promise.all(
        matchesData.map(async (match) => {
          const scoreResponse = await api.get(`/api/scores/match/${match._id}`);
          scoresData[match._id] = scoreResponse.data || [];
        })
      );
      setScores(scoresData);
      console.log("Initial matches and scores fetched:", { matches: matchesData, scores: scoresData });
    } catch (error) {
      console.error("Error fetching matches and scores:", error);
      setMatches([]);
      setScores({});
    }
  }, []);

  const updateMatchState = useCallback((matchId, updates) => {
    setMatches((prevMatches) =>
      prevMatches.map((match) =>
        match._id === matchId ? { ...match, ...updates } : match
      )
    );
  }, []);

  const updateScore = useCallback((newScore) => {
    setScores((prevScores) => {
      const matchId = newScore.match.toString();
      const updatedScores = { ...prevScores };
      if (!updatedScores[matchId]) updatedScores[matchId] = [];
      updatedScores[matchId] = [...updatedScores[matchId], newScore];
      console.log(`Home: Updated scores for match ${matchId} at ${new Date().toISOString()}`, newScore);
      return updatedScores;
    });

    setMatches((prevMatches) =>
      prevMatches.map((match) => {
        if (match._id === newScore.match.toString()) {
          const inningsKey = `innings${newScore.innings}`;
          const runs = (match.runsScored?.[inningsKey] || 0) + (newScore.runs || 0);
          const wickets = newScore.wicket
            ? (match.wickets?.[inningsKey] || 0) + 1
            : match.wickets?.[inningsKey] || 0;

          const matchScores = scores[match._id] || [];
          const legalBalls = matchScores.filter(
            (s) => s.innings === newScore.innings && s.ballType === "legal"
          ).length + (newScore.ballType === "legal" ? 1 : 0);
          const oversWhole = Math.floor(legalBalls / 6);
          const oversFraction = legalBalls % 6;
          const overs = oversWhole + oversFraction / 10;

          return {
            ...match,
            runsScored: { ...match.runsScored, [inningsKey]: runs },
            wickets: { ...match.wickets, [inningsKey]: wickets },
            oversBowled: { ...match.oversBowled, [inningsKey]: overs },
            currentBatsmen: newScore.batsman && !match.currentBatsmen?.some(b => b._id === newScore.batsman)
              ? [...(match.currentBatsmen || []), { _id: newScore.batsman }]
              : match.currentBatsmen,
            currentBowler: newScore.bowler ? { _id: newScore.bowler } : match.currentBowler,
          };
        }
        return match;
      })
    );
  }, [scores]);

  useEffect(() => {
    fetchMatchesAndScores();

    socket.on("connect", () => {
      console.log("Home: Connected to socket server");
      socket.emit("joinMatches");
    });

    socket.on("matchUpdate", (updatedMatch) => {
      console.log("Home: Received matchUpdate at", new Date().toISOString(), updatedMatch);
      updateMatchState(updatedMatch._id, updatedMatch);
    });

    socket.on("scoreUpdate", (newScore) => {
      console.log("Home: Received scoreUpdate at", new Date().toISOString(), newScore);
      updateScore(newScore);
    });

    socket.on("newMatch", (newMatch) => {
      console.log("Home: Received newMatch:", newMatch);
      setMatches((prevMatches) => {
        if (!prevMatches.some((match) => match._id === newMatch._id)) {
          return [...prevMatches, newMatch];
        }
        return prevMatches;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("matchUpdate");
      socket.off("scoreUpdate");
      socket.off("newMatch");
    };
  }, [fetchMatchesAndScores, updateMatchState, updateScore]);

  const prioritizeMatches = (matches) => {
    const ongoing = matches.filter((match) => match.status === "Ongoing" || match.status === "Stopped");
    const scheduled = matches.filter((match) => match.status === "Scheduled");
    const completed = matches.filter((match) => match.status === "Completed" || match.status === "Cancelled");
    return [...ongoing, ...scheduled, ...completed];
  };

  const sliderSettings = {
    dots: false,
    infinite: true,
    speed: 500,
    slidesToShow: Math.min(3, matches.length),
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    prevArrow: <PrevArrow />,
    nextArrow: <NextArrow />,
    responsive: [{ breakpoint: 768, settings: { slidesToShow: 1 } }],
  };

  const chunkMatches = (arr, size) => {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  };

  const calculateMatchStats = (matchId) => {
    const matchScores = scores[matchId] || [];
    const stats = { runsScored: {}, wickets: {}, oversBowled: {} };

    matchScores.forEach((score) => {
      const inningsKey = `innings${score.innings}`;
      stats.runsScored[inningsKey] = (stats.runsScored[inningsKey] || 0) + (score.runs || 0);
      stats.wickets[inningsKey] = score.wicket
        ? (stats.wickets[inningsKey] || 0) + 1
        : stats.wickets[inningsKey] || 0;

      const legalBalls = matchScores.filter(
        (s) => s.innings === score.innings && s.ballType === "legal"
      ).length;
      const oversWhole = Math.floor(legalBalls / 6);
      const oversFraction = legalBalls % 6;
      stats.oversBowled[inningsKey] = oversWhole + oversFraction / 10;
    });

    console.log(`Stats for match ${matchId}:`, stats);
    return stats;
  };

  const renderMatches = (matchList, title) => {
    const groups = chunkMatches(matchList, 3);
    if (groups.length === 0) return null;

    const rowsToShow = groups.slice(0, visibleRows);
    const hasMore = groups.length > visibleRows;

    return (
      <div className="mb-5">
        <h2 className="text-center mb-3 fw-bold" style={{ color: "var(--text-color)" }}>{title}</h2>
        {rowsToShow.map((group, groupIndex) => (
          <div key={groupIndex} className="row g-3 mb-3">
            {group.map((match) => {
              const matchStats = calculateMatchStats(match._id);
              const updatedMatch = {
                ...match,
                runsScored: { ...match.runsScored, ...matchStats.runsScored },
                wickets: { ...match.wickets, ...matchStats.wickets },
                oversBowled: { ...match.oversBowled, ...matchStats.oversBowled },
              };
              return (
                <div key={match._id} className="col-12 col-md-4 col-lg-4">
                  <Link to={`/match/${match._id}`} className="text-decoration-none">
                    <MatchCard
                      match={updatedMatch}
                      onClick={() => console.log("Card clicked:", match._id)}
                    />
                  </Link>
                </div>
              );
            })}
            {group.length < 3 &&
              Array.from({ length: 3 - group.length }).map((_, index) => (
                <div key={`placeholder-${groupIndex}-${index}`} className="col-12 col-md-4 col-lg-4"></div>
              ))}
          </div>
        ))}
        {hasMore && (
          <div className="text-center mt-3">
            <button
              className="load-more-btn btn btn-primary"
              onClick={() => setVisibleRows((prev) => prev + 2)}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  const prioritizedMatches = prioritizeMatches(matches);
  const ongoingMatches = matches.filter((match) => match.status === "Ongoing" || match.status === "Stopped");
  const scheduledMatches = matches.filter((match) => match.status === "Scheduled");
  const completedMatches = matches.filter((match) => match.status === "Completed" || match.status === "Cancelled");

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="container py-4 flex-grow-1">
        {matches.length > 0 && (
          <div className="mb-5">
            <h2 className="text-left mb-3 fw-bold" style={{ color: "var(--text-color)" }}>
              Matches For You
            </h2>
            <Slider {...sliderSettings}>
              {prioritizedMatches.map((match) => {
                const matchStats = calculateMatchStats(match._id);
                const updatedMatch = {
                  ...match,
                  runsScored: { ...match.runsScored, ...matchStats.runsScored },
                  wickets: { ...match.wickets, ...matchStats.wickets },
                  oversBowled: { ...match.oversBowled, ...matchStats.oversBowled },
                };
                return (
                  <div key={match._id} className="px-2">
                    <Link to={`/match/${match._id}`} className="text-decoration-none">
                      <MatchCard
                        match={updatedMatch}
                        onClick={() => console.log("Card clicked:", match._id)}
                      />
                    </Link>
                  </div>
                );
              })}
            </Slider>
          </div>
        )}
        {renderMatches(ongoingMatches, "Ongoing Matches")}
        {renderMatches(scheduledMatches, "Scheduled Matches")}
        {renderMatches(completedMatches, "Completed Matches")}
      </div>
      <Footer />
    </div>
  );
}

export default Home;