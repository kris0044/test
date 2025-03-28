import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { FaUsers, FaTrophy, FaUserFriends, FaBaseballBall, FaHands, FaMapMarkerAlt, FaFlag } from "react-icons/fa";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import "../assets/styles/styles.css";
import api from "../utility/axiosInterceptor.js";

ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

function Dashboard() {
  const [username, setUsername] = useState("Admin");
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    playersCount: 0,
    matchesCount: 0,
    tournamentsCount: 0,
    usersCount: 0,
    teamsCount: 0,
    venuesCount: 0,
    umpiresCount: 0,
    ongoingMatches: 0,
    scheduledTournaments: 0,
    playersByTeam: {},
    matchesByStatus: { Ongoing: 0, Completed: 0, Scheduled: 0 },
    tournamentsByStatus: { Scheduled: 0, Ongoing: 0, Completed: 0 },
  });

  useEffect(() => {
    const name = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    if (!name || (role !== "admin" && role !== "scorer")) {
      navigate("/");
    } else {
      setUsername(name);
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get("/api/dashboard/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "bottom" },
      tooltip: { enabled: true },
    },
    cutout: "70%",
  };

  const barChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: "#e0e0e0" } },
      x: { grid: { display: false } },
    },
  };

  const colorPalette = [
    "#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9", "#92A8D1",
    "#955251", "#B565A7", "#009B77", "#DD4124", "#45B7D1",
    "#D4A5A5", "#5DADE2", "#F9E79F", "#A569BD", "#48C9B0",
  ];

  const playersChartData = {
    labels: Object.keys(stats.playersByTeam),
    datasets: [{
      data: Object.values(stats.playersByTeam),
      backgroundColor: Object.keys(stats.playersByTeam).map((_, i) => colorPalette[i % colorPalette.length]),
      borderWidth: 0,
    }],
  };

  const matchesChartData = {
    labels: ["Ongoing", "Completed", "Scheduled"],
    datasets: [{
      data: [stats.matchesByStatus.Ongoing, stats.matchesByStatus.Completed, stats.matchesByStatus.Scheduled],
      backgroundColor: ["#FF6F61", "#6B5B95", "#88B04B"],
      borderWidth: 0,
    }],
  };

  const tournamentsChartData = {
    labels: ["Scheduled", "Ongoing", "Completed"],
    datasets: [{
      data: [stats.tournamentsByStatus.Scheduled, stats.tournamentsByStatus.Ongoing, stats.tournamentsByStatus.Completed],
      backgroundColor: ["#F7CAC9", "#92A8D1", "#955251"],
      borderWidth: 0,
    }],
  };

  const usersChartData = createCircularData(stats.usersCount, ["#B565A7", "#e0e0e0"]);
  const teamsChartData = createCircularData(stats.teamsCount, ["#009B77", "#e0e0e0"]);

  const barChartData = {
    labels: ["Players", "Matches", "Tournaments", "Users", "Teams", "Venues", "Umpires"],
    datasets: [{
      data: [
        stats.playersCount,
        stats.matchesCount,
        stats.tournamentsCount,
        stats.usersCount,
        stats.teamsCount,
        stats.venuesCount,
        stats.umpiresCount,
      ],
      backgroundColor: ["#4CAF50", "#2196F3", "#FFC107", "#9C27B0", "#E91E63", "#FF5722", "#795548"],
      borderWidth: 1,
      borderColor: "#fff",
    }],
  };

  return (
    <AdminLayout>
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome, {username}</h1>
        </div>

        <div className="cards-container">
          <Card title="Players" value={stats.playersCount} icon={FaUsers} link="/AdminPlayers" />
          <Card title="Matches" value={stats.matchesCount} icon={FaBaseballBall} link="/CreateMatch" />
          <Card title="Tournaments" value={stats.tournamentsCount} icon={FaTrophy} link="/AdminTournaments" />
          <Card title="Users" value={stats.usersCount} icon={FaUserFriends} link="/users" />
          <Card title="Teams" value={stats.teamsCount} icon={FaHands} link="/CreateTeam" />
          <Card title="Venues" value={stats.venuesCount} icon={FaMapMarkerAlt} link="/venues" />
          <Card title="Umpires" value={stats.umpiresCount} icon={FaFlag} link="/umpires" />
        </div>

        <h2 className="section-title">Detailed Statistics</h2>
        <div className="stats-container">
          <div className="circular-cards-container">
            <CircularCard title="Players" chartData={playersChartData} />
            <CircularCard title="Matches" chartData={matchesChartData} />
            <CircularCard title="Tournaments" chartData={tournamentsChartData} />
            <CircularCard title="Users" chartData={usersChartData} total={stats.usersCount} />
            <CircularCard title="Teams" chartData={teamsChartData} total={stats.teamsCount} />
          </div>

          <div className="bar-chart-container">
            <h3>Overview</h3>
            <div className="bar-chart-wrapper">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );

  function Card({ title, value, icon: Icon, link }) {
    const navigate = useNavigate();
    return (
      <div className="dashboard-card">
        <div className="card-header">
          <Icon size={24} />
          <h3>{title}</h3>
        </div>
        <p className="card-value">{value}</p>
        {link && (
          <button className="card-btn" onClick={() => navigate(link)}>
            View Details
          </button>
        )}
      </div>
    );
  }

  function CircularCard({ title, chartData, total }) {
    return (
      <div className="circular-dashboard-card">
        <div className="card-content">
          <div className="chart-container">
            <Doughnut data={chartData} options={chartOptions} />
            {total !== undefined && (
              <div className="chart-center">
                <span className="value">{total}</span>
              </div>
            )}
          </div>
          <h3>{title}</h3>
        </div>
      </div>
    );
  }

  function createCircularData(value, colors) {
    return {
      datasets: [{
        data: [value, 100 - value],
        backgroundColor: colors,
        borderWidth: 0,
      }],
    };
  }
}

export default Dashboard;