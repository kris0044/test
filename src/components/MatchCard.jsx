import React, { useState } from "react";
import { FaArrowRight, FaClock, FaCheckCircle, FaPlayCircle } from "react-icons/fa";
import "../assets/styles/styles.css";

function MatchCard({ match, onClick }) {
  const [isHovered, setIsHovered] = useState(false);

  // Helper function to get value from Map or plain object
  const getValue = (data, key) => {
    if (data instanceof Map) {
      return data.get(key) || 0;
    }
    return data?.[key] || 0;
  };

  // Determine the winner and winning margin
  const getWinningMargin = () => {
    if (!match.winner || match.status !== "Completed") return null;

    const winnerIndex = match.teams.findIndex(
      (team) => team._id === (typeof match.winner === "string" ? match.winner : match.winner._id)
    );
    const loserIndex = winnerIndex === 0 ? 1 : 0;

    const winnerTeam = match.teams[winnerIndex];
    const winnerName = winnerTeam ? winnerTeam.name : "Unknown Team";

    const tossWinnerIndex = match.teams.findIndex((team) => team._id === match.tossWinner);
    const otherTeamIndex = tossWinnerIndex === 0 ? 1 : 0;

    let firstBattingTeamIndex;
    if (tossWinnerIndex === -1) {
      firstBattingTeamIndex = 0;
    } else if (match.tossChoice === "bat") {
      firstBattingTeamIndex = tossWinnerIndex;
    } else {
      firstBattingTeamIndex = otherTeamIndex;
    }

    const secondBattingTeamIndex = firstBattingTeamIndex === 0 ? 1 : 0;

    if (winnerIndex === firstBattingTeamIndex) {
      const runsMargin =
        (getValue(match.runsScored, "innings1") || 0) - (getValue(match.runsScored, "innings2") || 0);
      return `${winnerName} won by ${runsMargin} runs`;
    } else if (winnerIndex === secondBattingTeamIndex) {
      const wicketsTaken = getValue(match.wickets, "innings2") || 0;
      const wicketsRemaining = 10 - wicketsTaken;
      return `${winnerName} won by ${wicketsRemaining} wickets`;
    }

    return null;
  };

  // Get status color and icon
  const getStatusStyle = () => {
    switch (match.status) {
      case "Completed":
        return { color: "success", icon: <FaCheckCircle /> };
      case "Ongoing":
        return { color: "warning", icon: <FaPlayCircle /> };
      case "Scheduled":
        return { color: "info", icon: <FaClock /> };
      default:
        return { color: "secondary", icon: <FaClock /> };
    }
  };

  const statusStyle = getStatusStyle();

  return (
    <div
      className={`match-card ${isHovered ? "match-card-hovered" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick} // Assuming parent component passes an onClick handler
    >
      <div className="match-card-header">
        <div className="match-info">
          <h5 className="match-title">
            {match.tournament?.name || "Tournament Name"}
          </h5>
          <p className="match-details">
            {match.matchType || "Match Type"} • {match.venue || "Venue TBD"}
          </p>
        </div>
        <span className={`status-badge bg-${statusStyle.color}`}>
          {statusStyle.icon} {match.status}
        </span>
      </div>

      <div className="match-card-body">
        {/* Team 1 */}
        <div className="team-row">
          <div className="team-info">
            <span className="team-name">{match.teams[0]?.name || "Team 1"}</span>
          </div>
          <div className="score-info">
            <span className="score">
              {getValue(match.runsScored, "innings1")}/{getValue(match.wickets, "innings1")}
            </span>
            <span className="overs">
              ({getValue(match.oversBowled, "innings1")})
            </span>
          </div>
        </div>

        {/* Team 2 */}
        <div className="team-row">
          <div className="team-info">
            <span className="team-name">{match.teams[1]?.name || "Team 2"}</span>
          </div>
          <div className="score-info">
            <span className="score">
              {getValue(match.runsScored, "innings2")}/{getValue(match.wickets, "innings2")}
            </span>
            <span className="overs">
              ({getValue(match.oversBowled, "innings2")})
            </span>
          </div>
        </div>

        {/* Result */}
        {match.status === "Completed" && (
          <p className="match-result text-success">{getWinningMargin()}</p>
        )}
      </div>

    
    </div>
  );
}

export default MatchCard;