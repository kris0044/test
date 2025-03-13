import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import LoadingSpinner from "./LoadingSpinner"; // Import the cricket spinner

const Stats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredStats, setFilteredStats] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [currentCategory, setCurrentCategory] = useState("Runs");
  const [visibleRecords, setVisibleRecords] = useState(10);

  const categories = ["Runs", "Wickets", "Sixes", "Fours", "Strike Rate", "Economy"];

  useEffect(() => {
    const fetchTournamentsAndTeams = async () => {
      try {
        setLoading(true);
        const [tournamentsResponse, teamsResponse] = await Promise.all([
          axios.get("http://localhost:5000/api/tournaments"),
          axios.get("http://localhost:5000/api/teams"),
        ]);
        setTournaments(tournamentsResponse.data);
        setTeams(teamsResponse.data);
        if (tournamentsResponse.data.length > 0) {
          setSelectedTournamentId(tournamentsResponse.data[0]._id);
        }
      } catch (error) {
        console.error("Error fetching tournaments or teams:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTournamentsAndTeams();
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      if (!selectedTournamentId) return;
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:5000/api/tournaments/${selectedTournamentId}/key-players`
        );
        const {
          topRunScorers,
          topWicketTakers,
          topSixes,
          topFours,
          topStrikeRate,
          bestEconomy,
        } = response.data;

        const allStats = [
          ...topRunScorers.map((p) => ({ ...p, category: "Runs" })),
          ...topWicketTakers.map((p) => ({ ...p, category: "Wickets" })),
          ...topSixes.map((p) => ({ ...p, category: "Sixes" })),
          ...topFours.map((p) => ({ ...p, category: "Fours" })),
          ...topStrikeRate.map((p) => ({ ...p, category: "Strike Rate" })),
          ...bestEconomy.map((p) => ({ ...p, category: "Economy" })),
        ];

        const enhancedStats = allStats.map((player, index) => ({
          no: index + 1,
          player: player.name || "Unknown",
          team: player.team || "Unknown",
          runs: player.runs || 0,
          wickets: player.wickets || 0,
          sixes: player.sixes || 0,
          fours: player.fours || 0,
          strikeRate: player.strikeRate || 0,
          economy: player.economy || 0,
          mat: player.matches || 10,
          inns: player.innings || 8,
          hs: player.highestScore || player.runs || 0,
          avg: player.average || (player.runs / (player.innings || 1)) || 0,
          hundreds: player.centuries || (player.runs >= 100 ? 1 : 0),
          fifties: player.fifties || (player.runs >= 50 ? 1 : 0),
          category: player.category || "Runs",
        }));

        setStats(enhancedStats);
        const filtered = enhancedStats.filter((p) => p.category === currentCategory);
        setFilteredStats(filtered);
        setVisibleRecords(10);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedTournamentId, currentCategory]);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleFilter = async (tournament, most, team) => {
    if (!tournament) return;

    try {
      setLoading(true);
      setSelectedTournamentId(tournament);
      setCurrentCategory(most);
      const response = await axios.get(
        `http://localhost:5000/api/tournaments/${tournament}/key-players`,
        { params: { most, team } }
      );

      const {
        topRunScorers,
        topWicketTakers,
        topSixes,
        topFours,
        topStrikeRate,
        bestEconomy,
      } = response.data;

      const allStats = [
        ...topRunScorers.map((p) => ({ ...p, category: "Runs" })),
        ...topWicketTakers.map((p) => ({ ...p, category: "Wickets" })),
        ...topSixes.map((p) => ({ ...p, category: "Sixes" })),
        ...topFours.map((p) => ({ ...p, category: "Fours" })),
        ...topStrikeRate.map((p) => ({ ...p, category: "Strike Rate" })),
        ...bestEconomy.map((p) => ({ ...p, category: "Economy" })),
      ];

      const enhancedStats = allStats.map((player, index) => ({
        no: index + 1,
        player: player.name || "Unknown",
        team: player.team || "Unknown",
        runs: player.runs || 0,
        wickets: player.wickets || 0,
        sixes: player.sixes || 0,
        fours: player.fours || 0,
        strikeRate: player.strikeRate || 0,
        economy: player.economy || 0,
        mat: player.matches || 10,
        inns: player.innings || 8,
        hs: player.highestScore || player.runs || 0,
        avg: player.average || (player.runs / (player.innings || 1)) || 0,
        hundreds: player.centuries || (player.runs >= 100 ? 1 : 0),
        fifties: player.fifties || (player.runs >= 50 ? 1 : 0),
        category: player.category || "Runs",
      }));

      setStats(enhancedStats);
      const filtered = enhancedStats.filter((p) => p.category === most);
      setFilteredStats(filtered);
      setVisibleRecords(10);
      handleCloseModal();
    } catch (error) {
      console.error("Error applying filters:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormFilter = (e) => {
    e.preventDefault();
    const form = e.target;
    const most = form.most.value;
    const team = form.team.value;
    const tournament = form.tournament.value || selectedTournamentId;
    handleFilter(tournament, most, team);
  };

  const handleShuffle = () => {
    const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)]?._id || "";
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomTeam = Math.random() > 0.5 ? teams[Math.floor(Math.random() * teams.length)]?.name || "" : "";
    handleFilter(randomTournament, randomCategory, randomTeam);
  };

  const loadMore = () => {
    setVisibleRecords((prev) => prev + 10);
  };

  const getTableHeaders = () => {
    const baseHeaders = [
      <th key="no" scope="col" className="text-center">No.</th>,
      <th key="player" scope="col">Player</th>,
      <th key="team" scope="col">Team</th>,
    ];

    switch (currentCategory) {
      case "Runs":
        return [
          ...baseHeaders,
          <th key="runs" scope="col" className="text-center">Runs</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="inns" scope="col" className="text-center">Inns</th>,
          <th key="hs" scope="col" className="text-center">HS</th>,
          <th key="avg" scope="col" className="text-center">Avg</th>,
          <th key="strikeRate" scope="col" className="text-center">SR</th>,
          <th key="hundreds" scope="col" className="text-center">100</th>,
          <th key="fifties" scope="col" className="text-center">50</th>,
          <th key="fours" scope="col" className="text-center">4s</th>,
          <th key="sixes" scope="col" className="text-center">6s</th>,
        ];
      case "Wickets":
        return [
          ...baseHeaders,
          <th key="wickets" scope="col" className="text-center">Wkts</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="inns" scope="col" className="text-center">Inns</th>,
          <th key="economy" scope="col" className="text-center">Economy</th>,
        ];
      case "Sixes":
        return [
          ...baseHeaders,
          <th key="sixes" scope="col" className="text-center">6s</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="inns" scope="col" className="text-center">Inns</th>,
        ];
      case "Fours":
        return [
          ...baseHeaders,
          <th key="fours" scope="col" className="text-center">4s</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="inns" scope="col" className="text-center">Inns</th>,
        ];
      case "Strike Rate":
        return [
          ...baseHeaders,
          <th key="strikeRate" scope="col" className="text-center">SR</th>,
          <th key="runs" scope="col" className="text-center">Runs</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="inns" scope="col" className="text-center">Inns</th>,
        ];
      case "Economy":
        return [
          ...baseHeaders,
          <th key="economy" scope="col" className="text-center">Economy</th>,
          <th key="wickets" scope="col" className="text-center">Wkts</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="inns" scope="col" className="text-center">Inns</th>,
        ];
      default:
        return baseHeaders;
    }
  };

  const getTableRow = (player) => {
    const baseCells = [
      <td key="no" className="text-center">{player.no}</td>,
      <td key="player">{player.player}</td>,
      <td key="team">{player.team}</td>,
    ];

    switch (currentCategory) {
      case "Runs":
        return [
          ...baseCells,
          <td key="runs" className="text-center fw-bold">{player.runs}</td>,
          <td key="mat" className="text-center">{player.mat}</td>,
          <td key="inns" className="text-center">{player.inns}</td>,
          <td key="hs" className="text-center">{player.hs}</td>,
          <td key="avg" className="text-center">{player.avg?.toFixed(2) || 0}</td>,
          <td key="strikeRate" className="text-center">{player.strikeRate?.toFixed(2) || 0}</td>,
          <td key="hundreds" className="text-center">{player.hundreds}</td>,
          <td key="fifties" className="text-center">{player.fifties}</td>,
          <td key="fours" className="text-center">{player.fours}</td>,
          <td key="sixes" className="text-center">{player.sixes}</td>,
        ];
      case "Wickets":
        return [
          ...baseCells,
          <td key="wickets" className="text-center fw-bold">{player.wickets}</td>,
          <td key="mat" className="text-center">{player.mat}</td>,
          <td key="inns" className="text-center">{player.inns}</td>,
          <td key="economy" className="text-center">{player.economy?.toFixed(2) || 0}</td>,
        ];
      case "Sixes":
        return [
          ...baseCells,
          <td key="sixes" className="text-center fw-bold">{player.sixes}</td>,
          <td key="mat" className="text-center">{player.mat}</td>,
          <td key="inns" className="text-center">{player.inns}</td>,
        ];
      case "Fours":
        return [
          ...baseCells,
          <td key="fours" className="text-center fw-bold">{player.fours}</td>,
          <td key="mat" className="text-center">{player.mat}</td>,
          <td key="inns" className="text-center">{player.inns}</td>,
        ];
      case "Strike Rate":
        return [
          ...baseCells,
          <td key="strikeRate" className="text-center fw-bold">{player.strikeRate?.toFixed(2) || 0}</td>,
          <td key="runs" className="text-center">{player.runs}</td>,
          <td key="mat" className="text-center">{player.mat}</td>,
          <td key="inns" className="text-center">{player.inns}</td>,
        ];
      case "Economy":
        return [
          ...baseCells,
          <td key="economy" className="text-center fw-bold">{player.economy?.toFixed(2) || 0}</td>,
          <td key="wickets" className="text-center">{player.wickets}</td>,
          <td key="mat" className="text-center">{player.mat}</td>,
          <td key="inns" className="text-center">{player.inns}</td>,
        ];
      default:
        return baseCells;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <LoadingSpinner size="large" message="Fetching cricket stats..." />
      </div>
    );
  }

  const displayedStats = filteredStats.slice(0, visibleRecords);
  const hasMore = visibleRecords < filteredStats.length;

  return (
    <div className="my">
      <Header />
    <div className="stats-container bg-light min-vh-100">
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
          <h2 className="fw-bold text-primary">Player Statistics</h2>
          <div className="d-flex gap-2">
            <button
              className="btn btn-primary shadow-sm"
              onClick={handleShowModal}
            >
              <i className="bi bi-filter me-2"></i>Apply Filters
            </button>
            <button
              className="btn btn-outline-success shadow-sm"
              onClick={handleShuffle}
              disabled={tournaments.length === 0 || teams.length === 0}
            >
              <i className="bi bi-shuffle me-2"></i>Shuffle
            </button>
          </div>
        </div>

        <div className="card shadow-sm border-0">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-striped align-middle mb-0">
                <thead className="table-dark">
                  <tr>{getTableHeaders()}</tr>
                </thead>
                <tbody>
                  {displayedStats.length > 0 ? (
                    displayedStats.map((player) => (
                      <tr key={player.no} className="transition-all hover:bg-light">
                        {getTableRow(player)}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={getTableHeaders().length} className="text-center py-4">
                        No statistics available for this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {hasMore && (
          <div className="text-center mt-4">
            <button
              className="btn btn-outline-primary shadow-sm px-4"
              onClick={loadMore}
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      <div
        className={`modal fade ${showModal ? "show" : ""}`}
        style={{ display: showModal ? "block" : "none" }}
        tabIndex="-1"
        aria-labelledby="filterModalLabel"
        aria-hidden={!showModal}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow-lg border-0">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title fw-bold" id="filterModalLabel">
                Filter Statistics
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={handleCloseModal}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body p-4">
              <form onSubmit={handleFormFilter}>
                <div className="row g-3">
                  <div className="col-md-12">
                    <label htmlFor="tournament" className="form-label fw-semibold">
                      Tournament
                    </label>
                    <select
                      className="form-select shadow-sm"
                      id="tournament"
                      name="tournament"
                      value={selectedTournamentId}
                      onChange={(e) => setSelectedTournamentId(e.target.value)}
                    >
                      <option value="">Select Tournament</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament._id} value={tournament._id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="most" className="form-label fw-semibold">
                      Category
                    </label>
                    <select className="form-select shadow-sm" id="most" name="most">
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="team" className="form-label fw-semibold">
                      Team
                    </label>
                    <select className="form-select shadow-sm" id="team" name="team">
                      <option value="">All Teams</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team.name}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 mt-4 shadow-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <LoadingSpinner size="small" message="" />
                  ) : (
                    "Apply Filters"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  </div>
  );
};

export default Stats;