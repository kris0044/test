import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import MatchCard from "./MatchCard";
import api from "../utility/axiosInterceptor.js";

// Initialize socket once, reusing it across components
const socket = io(api.defaults.baseURL, {
  reconnection: true, // Automatically reconnect if disconnected
  reconnectionAttempts: 5, // Try reconnecting 5 times
  reconnectionDelay: 1000, // Wait 1s between attempts
});

function Home() {
  const [matches, setMatches] = useState([]);
  const [visibleRows, setVisibleRows] = useState(2); // Initially show 2 rows

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const response = await api.get("/api/matches");
        setMatches(response.data);
        console.log("Initial matches:", response.data);
      } catch (error) {
        console.error("Error fetching matches:", error);
      }
    };

    fetchMatches();

    // Log socket connection status
    socket.on("connect", () => {
      console.log("Home: Connected to socket server");
    });

    socket.on("disconnect", () => {
      console.log("Home: Disconnected from socket server");
    });

    // Handle match updates
    socket.on("matchUpdate", (updatedMatch) => {
      console.log("Home: Received matchUpdate:", updatedMatch);
      setMatches((prevMatches) => {
        const matchExists = prevMatches.some((match) => match._id === updatedMatch._id);
        if (matchExists) {
          return prevMatches.map((match) =>
            match._id === updatedMatch._id ? updatedMatch : match
          );
        }
        return [...prevMatches, updatedMatch];
      });
    });

    // Handle new matches
    socket.on("newMatch", (newMatch) => {
      console.log("Home: Received newMatch:", newMatch);
      setMatches((prevMatches) => {
        if (!prevMatches.some((match) => match._id === newMatch._id)) {
          return [...prevMatches, newMatch];
        }
        return prevMatches;
      });
    });

    // Cleanup: Remove listeners when component unmounts
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("matchUpdate");
      socket.off("newMatch");
      // Do NOT disconnect here; let it persist for other components
      // socket.disconnect();
    };
  }, []); // Empty dependency array since socket is now outside

  const chunkMatches = (arr, size) => {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  };

  const renderMatches = (matchList, title) => {
    const groups = chunkMatches(matchList, 3);
    if (groups.length === 0) return null;

    const rowsToShow = groups.slice(0, visibleRows);
    const hasMore = groups.length > visibleRows;

    return (
      <div className="mb-5">
        <h2 className="text-center mb-3 fw-bold" style={{ color: "var(--text-color)" }}>
          {title}
        </h2>
        {rowsToShow.map((group, groupIndex) => (
          <div key={groupIndex} className="row g-3 mb-3">
            {group.map((match) => (
              <div key={match._id} className="col-12 col-md-4 col-lg-4">
                <Link to={`/match/${match._id}`} className="text-decoration-none">
                  <MatchCard match={match} onClick={() => console.log("Card clicked:", match._id)} />
                </Link>
              </div>
            ))}
            {group.length < 3 &&
              Array.from({ length: 3 - group.length }).map((_, index) => (
                <div key={`placeholder-${groupIndex}-${index}`} className="col-12 col-md-4 col-lg-4"></div>
              ))}
          </div>
        ))}
        {hasMore && (
          <div className="text-center mt-3">
            <button
              className="load-more-btn"
              onClick={() => setVisibleRows((prev) => prev + 2)}
            >
              Load More
            </button>
          </div>
        )}
      </div>
    );
  };

  const ongoingMatches = matches.filter((match) => match.status === "Ongoing");
  const scheduledMatches = matches.filter((match) => match.status === "Scheduled");
  const completedMatches = matches.filter((match) => match.status === "Completed");

  return (
    <div className="d-flex flex-column min-vh-100">
      <Header />
      <div className="container py-4 flex-grow-1">
        <h1 className="text-center mb-4 fw-bold" style={{ color: "var(--text-color)" }}>
          Cricket Live Scores
        </h1>
        {renderMatches(ongoingMatches, "Ongoing Matches")}
        {renderMatches(scheduledMatches, "Scheduled Matches")}
        {renderMatches(completedMatches, "Completed Matches")}
      </div>
    </div>
  );
}

export default Home;