import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import { FaCalendarAlt, FaChevronDown, FaTrophy } from "react-icons/fa";
import "../assets/styles/styles.css";
import api from "../utility/axiosInterceptor.js";

function Series() {
  const [tournaments, setTournaments] = useState([]);
  const [visibleRows, setVisibleRows] = useState(2);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchTournaments = async () => {
      setIsLoading(true);
      try {
        const response = await api.get("/api/tournaments");
        setTournaments(response.data);
        console.log("Tournaments fetched:", response.data);
      } catch (error) {
        console.error("Error fetching tournaments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const chunkTournaments = (arr, size) => {
    const chunked = [];
    for (let i = 0; i < arr.length; i += size) {
      chunked.push(arr.slice(i, i + size));
    }
    return chunked;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Completed":
        return { color: "success", text: "Completed" };
      case "Ongoing":
        return { color: "warning", text: "Ongoing" };
      case "Scheduled":
        return { color: "info", text: "Scheduled" };
      default:
        return { color: "secondary", text: "Unknown" };
    }
  };

  const renderTournaments = () => {
    const groups = chunkTournaments(tournaments, 3);

    if (groups.length === 0) {
      return (
        <div className="text-center py-5">
          <p className="text-muted">No tournaments available.</p>
        </div>
      );
    }

    const rowsToShow = groups.slice(0, visibleRows);
    const hasMore = groups.length > visibleRows;

    return (
      <div className="tournaments-section mb-5">
        {isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            {rowsToShow.map((group, groupIndex) => (
              <div key={groupIndex} className="row g-4 mb-4 animate__animated animate__fadeIn">
                {group.map((tournament) => {
                  const statusStyle = getStatusStyle(tournament.status);
                  const winnerName =
                    tournament.status === "Completed" && tournament.winner?.name
                      ? tournament.winner.name
                      : null;
                  return (
                    <div key={tournament._id} className="col-12 col-md-4 col-lg-4">
                      <Link to={`/tournament/${tournament._id}`} className="text-decoration-none">
                        <div className="tournament-card shadow-sm p-3">
                          <div className="card-header">
                            <h5 className="card-title mb-0 fw-bold text-truncate">
                              {tournament.name || "Tournament Name"}
                            </h5>
                            <span className={`status-badge bg-${statusStyle.color}`}>
                              {statusStyle.text}
                            </span>
                          </div>
                          <div className="card-body">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <FaCalendarAlt className="text-primary" />
                              <span className="text-muted small">
                                {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <FaTrophy className="text-warning" />
                              <span className="text-muted small">
                                Matches: {tournament.matches?.length || 0}
                              </span>
                            </div>
                            {winnerName && (
                              <div className="winner-info mt-2">
                                <span className="text-success small fw-bold">
                                  Winner: {winnerName}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="card-footer">
                            <span className="view-details">
                              View Details <FaChevronDown className="ms-1" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
                {group.length < 3 &&
                  Array.from({ length: 3 - group.length }).map((_, index) => (
                    <div
                      key={`placeholder-${groupIndex}-${index}`}
                      className="col-12 col-md-4 col-lg-4 invisible"
                    ></div>
                  ))}
              </div>
            ))}
            {hasMore && (
              <div className="text-center mt-4">
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleRows((prev) => prev + 2)}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Load More"}
                  {!isLoading && <FaChevronDown className="ms-2" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="d-flex flex-column min-vh-100 series-container">
      <Header />
      <div className="container py-5 flex-grow-1">{renderTournaments()}</div>
    </div>
  );
}

export default Series;