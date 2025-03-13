import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import { FaUserCircle, FaCalendarAlt, FaTrophy } from "react-icons/fa";
import "../assets/styles/styles.css"; // Ensure this points to your styles.css
import api from "../utility/axiosInterceptor.js";

const socket = io(api.defaults.baseURL);

function PlayerDetails() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState({ batting: {}, bowling: {} });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Overview"); // Default tab

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        setLoading(true);

        // Fetch player details
        const playerResponse = await api.get(`/api/players/${playerId}`, {
          params: { populate: "team" },
        });
        const playerData = playerResponse.data || {};
        setPlayer(playerData);

        // Fetch matches involving the player
        const matchesResponse = await api.get(`/api/players/${playerId}`, {
          params: { limit: 10 },
        });
        setMatches(matchesResponse.data || []);

        // Fetch player stats (assuming an endpoint exists)
        const statsResponse = await api.get(`/api/players/${playerId}/stats`);
        setStats(statsResponse.data || { batting: {}, bowling: {} });
      } catch (error) {
        console.error("Error fetching player details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerDetails();

    // Socket listeners for real-time updates (if applicable)
    socket.on("playerUpdate", (updatedPlayer) => {
      if (updatedPlayer._id === playerId) {
        setPlayer(updatedPlayer || {});
      }
    });

    return () => {
      socket.off("playerUpdate");
    };
  }, [playerId]);

  if (loading) return <div className="text-center py-4">Loading...</div>;
  if (!player) return <div className="text-center py-4">Player not found</div>;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const calculateBattingStats = () => {
    const { runs, balls, innings } = stats.batting;
    const average = innings > 0 ? (runs / innings).toFixed(2) : "0.00";
    const strikeRate = balls > 0 ? ((runs / balls) * 100).toFixed(2) : "0.00";
    return { ...stats.batting, average, strikeRate };
  };

  const calculateBowlingStats = () => {
    const { runs, balls, wickets } = stats.bowling;
    const overs = balls > 0 ? (balls / 6).toFixed(1) : "0.0";
    const economy = balls > 0 ? (runs / (balls / 6)).toFixed(2) : "0.00";
    const average = wickets > 0 ? (runs / wickets).toFixed(2) : "0.00";
    return { ...stats.bowling, overs, economy, average };
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const battingStats = calculateBattingStats();
  const bowlingStats = calculateBowlingStats();

  return (
    <div className="d-flex flex-column min-vh-100 player-details-container">
      <Header />
      <div className="container py-4">
        {/* Navigation Tabs */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
          <div className="container-fluid">
            <ul className="nav nav-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "Overview" ? "active" : ""}`}
                  onClick={() => handleTabClick("Overview")}
                >
                  Overview
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "Matches" ? "active" : ""}`}
                  onClick={() => handleTabClick("Matches")}
                >
                  Matches
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === "Statistics" ? "active" : ""}`}
                  onClick={() => handleTabClick("Statistics")}
                >
                  Statistics
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Player Header */}
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-dark text-white d-flex align-items-center">
            <FaUserCircle size={50} className="me-3" />
            <div>
              <h2 className="mb-0">{player.name || "Unknown Player"}</h2>
              <p className="small mb-0 text-muted">
                {player.team?.name || "Team TBD"} | {player.role || "All Rounder"}
              </p>
            </div>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "Overview" && (
          <div className="row">
            <div className="col-md-8">
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h3 className="h5 mb-3">Player Information</h3>
                  <div className="row">
                    <div className="col-md-6">
                      <p>
                        <strong>Team:</strong> {player.team?.name || "N/A"}
                      </p>
                      <p>
                        <strong>Role:</strong> {player.role || "N/A"}
                      </p>
                      <p>
                        <strong>Batting Style:</strong> {player.battingStyle || "Right Hand"}
                      </p>
                    </div>
                    <div className="col-md-6">
                      <p>
                        <strong>Bowling Style:</strong> {player.bowlingStyle || "N/A"}
                      </p>
                      <p>
                        <strong>Date of Birth:</strong>{" "}
                        {player.dob ? formatDate(player.dob) : "N/A"}
                      </p>
                      <p>
                        <strong>Nationality:</strong> {player.nationality || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card shadow-sm">
                <div className="card-body text-center">
                  <h3 className="h5 mb-3">Quick Stats</h3>
                  <p>
                    <strong>Runs:</strong> {battingStats.runs || 0}
                  </p>
                  <p>
                    <strong>Wickets:</strong> {bowlingStats.wickets || 0}
                  </p>
                  <p>
                    <strong>Matches:</strong> {matches.length || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === "Matches" && (
          <div className="card shadow-sm">
            <div className="card-body">
              <h3 className="h5 mb-3">Recent Matches</h3>
              {matches.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-bordered table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Match</th>
                        <th>Runs</th>
                        <th>Balls</th>
                        <th>Wickets</th>
                        <th>Runs Conceded</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((match) => {
                        const playerBatting = match.scores?.find(
                          (score) =>
                            (score.batsman === playerId || score.batsman?._id === playerId) &&
                            score.runs !== undefined
                        );
                        const playerBowling = match.scores?.find(
                          (score) =>
                            (score.bowler === playerId || score.bowler?._id === playerId) &&
                            score.wicket !== undefined
                        );
                        const winnerId =
                          typeof match.winner === "string" ? match.winner : match.winner?._id;
                        const teamWon = match.teams.find((team) => team._id === winnerId)?.name;
                        return (
                          <tr key={match._id}>
                            <td>{formatDate(match.createdAt)}</td>
                            <td>
                              {match.teams[0]?.name} vs {match.teams[1]?.name}
                            </td>
                            <td>{playerBatting?.runs || 0}</td>
                            <td>{playerBatting?.balls || 0}</td>
                            <td>{playerBowling?.wickets || 0}</td>
                            <td>{playerBowling?.runs || 0}</td>
                            <td>
                              {match.status === "Completed" && teamWon
                                ? `${teamWon} won`
                                : "In Progress"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted">No recent matches available.</p>
              )}
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === "Statistics" && (
          <div className="row">
            <div className="col-md-6">
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h3 className="h5 mb-3">Batting Statistics</h3>
                  <table className="table table-bordered table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Matches</strong></td>
                        <td>{battingStats.matches || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Innings</strong></td>
                        <td>{battingStats.innings || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Runs</strong></td>
                        <td>{battingStats.runs || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Average</strong></td>
                        <td>{battingStats.average}</td>
                      </tr>
                      <tr>
                        <td><strong>Strike Rate</strong></td>
                        <td>{battingStats.strikeRate}</td>
                      </tr>
                      <tr>
                        <td><strong>Highest Score</strong></td>
                        <td>{battingStats.highest || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>50s/100s</strong></td>
                        <td>{battingStats.fifties || 0}/{battingStats.hundreds || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card shadow-sm mb-4">
                <div className="card-body">
                  <h3 className="h5 mb-3">Bowling Statistics</h3>
                  <table className="table table-bordered table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Matches</strong></td>
                        <td>{bowlingStats.matches || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Overs</strong></td>
                        <td>{bowlingStats.overs}</td>
                      </tr>
                      <tr>
                        <td><strong>Wickets</strong></td>
                        <td>{bowlingStats.wickets || 0}</td>
                      </tr>
                      <tr>
                        <td><strong>Average</strong></td>
                        <td>{bowlingStats.average}</td>
                      </tr>
                      <tr>
                        <td><strong>Economy</strong></td>
                        <td>{bowlingStats.economy}</td>
                      </tr>
                      <tr>
                        <td><strong>Best Figures</strong></td>
                        <td>{bowlingStats.best || "0/0"}</td>
                      </tr>
                      <tr>
                        <td><strong>5W Hauls</strong></td>
                        <td>{bowlingStats.fiveWickets || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PlayerDetails;