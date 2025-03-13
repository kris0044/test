import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import io from "socket.io-client";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import MatchCard from "./MatchCard"; // Import the MatchCard component
import api from "../utility/axiosInterceptor.js";

function Home() {
  const [matches, setMatches] = useState([]);
  const [socket, setSocket] = useState(null);
  const [visibleRows, setVisibleRows] = useState(2); // Initially show 2 rows

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

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

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
    });

    newSocket.on("matchUpdate", (updatedMatch) => {
      setMatches((prevMatches) => {
        const matchExists = prevMatches.some(match => match._id === updatedMatch._id);
        if (matchExists) {
          return prevMatches.map((match) =>
            match._id === updatedMatch._id ? updatedMatch : match
          );
        }
        return [...prevMatches, updatedMatch];
      });
    });

    newSocket.on("newMatch", (newMatch) => {
      setMatches((prevMatches) => {
        if (!prevMatches.some(match => match._id === newMatch._id)) {
          return [...prevMatches, newMatch];
        }
        return prevMatches;
      });
    });

    return () => {
      newSocket.disconnect();
      console.log("Socket disconnected");
    };
  }, []);

  const chunkMatches = (arr, size) => {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  };

  const renderMatches = (matchList, title) => {
    // Chunk matches into groups of 3 for each row
    const groups = chunkMatches(matchList, 3);

    // If no matches, don't render the section
    if (groups.length === 0) {
      return null;
    }

    // Calculate the number of rows to display based on visibleRows
    const rowsToShow = groups.slice(0, visibleRows);
    const hasMore = groups.length > visibleRows;

    return (
      <div className="mb-5">
        <h2 className="text-center mb-3 fw-bold" style={{ color: "var(--text-color)" }}>
          {title}
        </h2>
        {/* Render the rows */}
        {rowsToShow.map((group, groupIndex) => (
          <div key={groupIndex} className="row g-3 mb-3">
            {group.map((match) => (
              <div key={match._id} className="col-12 col-md-4 col-lg-4">
                <Link to={`/match/${match._id}`} className="text-decoration-none">
                  <MatchCard match={match} />
                </Link>
              </div>
            ))}
            {/* Fill empty slots in the row with invisible placeholders to maintain layout */}
            {group.length < 3 &&
              Array.from({ length: 3 - group.length }).map((_, index) => (
                <div key={`placeholder-${groupIndex}-${index}`} className="col-12 col-md-4 col-lg-4"></div>
              ))}
          </div>
        ))}
        {/* Load More Button */}
        {hasMore && (
          <div className="text-center mt-3">
            <button
              className="load-more-btn"
              onClick={() => setVisibleRows((prev) => prev + 2)} // Show 2 more rows
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