import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "./AdminLayout";
import { FaUsers, FaTrophy, FaUserFriends, FaBaseballBall, FaHands } from "react-icons/fa";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
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
    ongoingMatches: 0,
    scheduledTournaments: 0,
    playersByTeam: {},
    matchesByStatus: { Ongoing: 0, Completed: 0, Scheduled: 0 },
    tournamentsByStatus: { Scheduled: 0, Ongoing: 0, Completed: 0 },
  });

  useEffect(() => {
    const name = localStorage.getItem("username");
    const role = localStorage.getItem("role");

    if (!name || role !== "admin" && role !== "scorer") {
      navigate("/");
    } else {
      setUsername(name);
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const [playersRes, matchesRes, tournamentsRes, usersRes, teamsRes] = await Promise.all([
        api.get("/api/players"),
        api.get("/api/matches"),
        api.get("/api/tournaments"),
        api.get("/api/users"),
        api.get("/api/teams")
      ]);

      const players = playersRes.data;
      const matches = matchesRes.data;
      const tournaments = tournamentsRes.data;
      const users = usersRes.data;
      const teams = teamsRes.data;

      const playersByTeam = {};
      players.forEach(player => {
        const teamName = player.team || "No Team";
        playersByTeam[teamName] = (playersByTeam[teamName] || 0) + 1;
      });

      const matchesByStatus = {
        Ongoing: matches.filter(m => m.status === "Ongoing").length,
        Completed: matches.filter(m => m.status === "Completed").length,
        Scheduled: matches.filter(m => m.status === "Scheduled").length,
      };

      const tournamentsByStatus = {
        Scheduled: tournaments.filter(t => t.status === "Scheduled").length,
        Ongoing: tournaments.filter(t => t.status === "Ongoing").length,
        Completed: tournaments.filter(t => t.status === "Completed").length,
      };

      setStats({
        playersCount: players.length,
        matchesCount: matches.length,
        tournamentsCount: tournaments.length,
        usersCount: users.length,
        teamsCount: teams.length,
        ongoingMatches: matchesByStatus.Ongoing,
        scheduledTournaments: tournamentsByStatus.Scheduled,
        playersByTeam,
        matchesByStatus,
        tournamentsByStatus,
      });
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
      tooltip: { enabled: true }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#e0e0e0' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  const colorPalette = [
    "#FF6F61", "#6B5B95", "#88B04B", "#F7CAC9", "#92A8D1",
    "#955251", "#B565A7", "#009B77", "#DD4124", "#45B7D1",
    "#D4A5A5", "#5DADE2", "#F9E79F", "#A569BD", "#48C9B0"
  ];

  // Circular Chart Data (keeping from first code)
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

  // Bar Chart Data (taken from second code)
  const barChartData = {
    labels: ['Players', 'Matches', 'Tournaments', 'Users', 'Teams'],
    datasets: [{
      data: [stats.playersCount, stats.matchesCount, stats.tournamentsCount, stats.usersCount, stats.teamsCount],
      backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9C27B0', '#E91E63'],
      borderWidth: 1,
      borderColor: '#fff'
    }]
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

        <div className="dashboard-footer">
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              navigate("/login");
            }}
          >
            Logout
          </button>
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