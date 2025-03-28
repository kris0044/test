import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Header from "./Header";
import LoadingSpinner from "./LoadingSpinner";
import api from "../utility/axiosInterceptor.js";

const Stats = () => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [currentCategory, setCurrentCategory] = useState("Runs");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const categories = ["Runs", "Wickets", "Sixes", "Fours", "Strike Rate", "Economy"];
  const limit = 10;

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const [tournamentsResponse, teamsResponse] = await Promise.all([
          api.get("/api/states/tournaments/list"),
          api.get("/api/states/teams/list"),
        ]);
        setTournaments(tournamentsResponse.data);
        setTeams(teamsResponse.data);
        if (tournamentsResponse.data.length > 0) {
          setSelectedTournamentId(tournamentsResponse.data[0]._id);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedTournamentId, selectedTeam, currentCategory, page]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const params = { category: currentCategory, page, limit };
      if (selectedTeam) params.team = selectedTeam;

      const response = selectedTournamentId
        ? await api.get(`/api/states/tournaments/${selectedTournamentId}/stats`, { params })
        : await api.get("/api/states/stats/overall", { params });

      const { data, pagination } = response.data;
      setStats(data);
      setTotalPages(pagination.totalPages);
    } catch (error) {
      console.error("Error fetching stats:", error);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleFilter = (tournament, category, team) => {
    setSelectedTournamentId(tournament || "");
    setCurrentCategory(category || "Runs");
    setSelectedTeam(team || "");
    setPage(1);
    handleCloseModal();
  };

  const handleFormFilter = (e) => {
    e.preventDefault();
    const form = e.target;
    const tournament = form.tournament.value;
    const category = form.most.value;
    const team = form.team.value;
    handleFilter(tournament, category, team);
  };

  const handleShuffle = () => {
    const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)]?._id || "";
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomTeam = Math.random() > 0.5 ? teams[Math.floor(Math.random() * teams.length)]?._id || "" : "";
    handleFilter(randomTournament, randomCategory, randomTeam);
  };

  const loadMore = () => {
    if (page < totalPages) {
      setPage((prev) => prev + 1);
    }
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
          <th key="strikeRate" scope="col" className="text-center">SR</th>,
          <th key="fours" scope="col" className="text-center">4s</th>,
          <th key="sixes" scope="col" className="text-center">6s</th>,
        ];
      case "Wickets":
        return [
          ...baseHeaders,
          <th key="wickets" scope="col" className="text-center">Wkts</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
          <th key="economy" scope="col" className="text-center">Economy</th>,
        ];
      case "Sixes":
        return [
          ...baseHeaders,
          <th key="sixes" scope="col" className="text-center">6s</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
        ];
      case "Fours":
        return [
          ...baseHeaders,
          <th key="fours" scope="col" className="text-center">4s</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
        ];
      case "Strike Rate":
        return [
          ...baseHeaders,
          <th key="strikeRate" scope="col" className="text-center">SR</th>,
          <th key="runs" scope="col" className="text-center">Runs</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
        ];
      case "Economy":
        return [
          ...baseHeaders,
          <th key="economy" scope="col" className="text-center">Economy</th>,
          <th key="wickets" scope="col" className="text-center">Wkts</th>,
          <th key="mat" scope="col" className="text-center">Mat</th>,
        ];
      default:
        return baseHeaders;
    }
  };

  const getTableRow = (player, index) => {
    const no = (page - 1) * limit + index + 1;
    const baseCells = [
      <td key="no" className="text-center">{no}</td>,
      <td key="player">{player.name}</td>,
      <td key="team">{player.team}</td>,
    ];

    switch (currentCategory) {
      case "Runs":
        return [
          ...baseCells,
          <td key="runs" className="text-center fw-bold">{player.runs}</td>,
          <td key="mat" className="text-center">{player.matches}</td>,
          <td key="strikeRate" className="text-center">{player.strikeRate.toFixed(2)}</td>,
          <td key="fours" className="text-center">{player.fours}</td>,
          <td key="sixes" className="text-center">{player.sixes}</td>,
        ];
      case "Wickets":
        return [
          ...baseCells,
          <td key="wickets" className="text-center fw-bold">{player.wickets}</td>,
          <td key="mat" className="text-center">{player.matches}</td>,
          <td key="economy" className="text-center">{player.economy.toFixed(2)}</td>,
        ];
      case "Sixes":
        return [
          ...baseCells,
          <td key="sixes" className="text-center fw-bold">{player.sixes}</td>,
          <td key="mat" className="text-center">{player.matches}</td>,
        ];
      case "Fours":
        return [
          ...baseCells,
          <td key="fours" className="text-center fw-bold">{player.fours}</td>,
          <td key="mat" className="text-center">{player.matches}</td>,
        ];
      case "Strike Rate":
        return [
          ...baseCells,
          <td key="strikeRate" className="text-center fw-bold">{player.strikeRate.toFixed(2)}</td>,
          <td key="runs" className="text-center">{player.runs}</td>,
          <td key="mat" className="text-center">{player.matches}</td>,
        ];
      case "Economy":
        return [
          ...baseCells,
          <td key="economy" className="text-center fw-bold">{player.economy.toFixed(2)}</td>,
          <td key="wickets" className="text-center">{player.wickets}</td>,
          <td key="mat" className="text-center">{player.matches}</td>,
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

  return (
    <div className="my">
      <Header />
      <div className="stats-container min-vh-100" style={{ background: "var(--background-color)" }}>
        <div className="container py-5">
          <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
            <h2 className="fw-bold text-primary">Player Statistics</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-primary shadow-sm" onClick={handleShowModal}>
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
                    {stats.length > 0 ? (
                      stats.map((player, index) => (
                        <tr key={player._id || index} className="transition-all hover:bg-light">
                          {getTableRow(player, index)}
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

          {page < totalPages && (
            <div className="text-center mt-4">
              <button className="btn btn-outline-primary shadow-sm px-4" onClick={loadMore}>
                Load More
              </button>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg border-0">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title fw-bold">Filter Statistics</h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={handleCloseModal}
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body p-4" style={{ background: "var(--card-bg)" }}>
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
                          <option value="">All Tournaments</option>
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
                        <select className="form-select shadow-sm" id="most" name="most" defaultValue="Runs">
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
                            <option key={team._id} value={team._id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn btn-primary w-100 mt-4 shadow-sm" disabled={loading}>
                      {loading ? <LoadingSpinner size="small" message="" /> : "Apply Filters"}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
        {showModal && <div className="modal-backdrop fade show"></div>}
      </div>
    </div>
  );
};

export default Stats;