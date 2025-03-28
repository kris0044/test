import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import CreateTeam from "./components/CreateTeam";
import AdminPlayers from "./components/AdminPlayers";
import AdminLayout from "./components/AdminLayout";
import CreateMatch from "./components/CreateMatch";
import ScoreMatch from "./components/ScoreMatch";
import MatchDetails from "./components/MatchDetails"; 
import Header from "./components/Header";
import Users from "./components/Users";
import AdminTournaments from "./components/AdminTournaments";
import TournamentDetail from "./components/TournamentDetail";
import Stats from "./components/Stats";
import Series from "./components/Series"; 
import Fixtures from "./components/Fixtures";
import PlayerDetails from "./components/PlayerDetails";
import VenueManagement from "./components/VenueManagement";
import UmpireManagement from "./components/UmpireManagement";
import AdminPages from "./components/AdminPages";
import Page from "./components/Page";
// import PlayerDetail from "./components/Playerdetail";

import "bootstrap/dist/css/bootstrap.min.css";
import "./assets/styles/tailwind.css";



function App() {
    
  return (
    <Router>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard /> } />
        <Route path="/CreateTeam" element={<CreateTeam /> } />
        <Route path="/AdminPlayers" element={<AdminPlayers /> } />
        <Route path="/home" element={ <Home /> } />
        <Route path="/AdminLayout" element={ <AdminLayout /> } />
        <Route path="/CreateMatch" element={ <CreateMatch /> } />
        <Route path="/score/:matchId" element={<ScoreMatch />} />
        <Route path="/" element={<Home />} />
        <Route path="/match/:matchId" element={<MatchDetails />} />
        <Route path="/tournament/:tournamentId" element={<TournamentDetail />} />
        <Route path="/header" element={<Header />} />
        <Route path="/users" element={<Users />} />
        <Route path="/AdminTournaments" element={<AdminTournaments />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/series" element={<Series />} />
        <Route path="/fixtures" element={<Fixtures />} /> 
        <Route path="/player/:playerId" element={<PlayerDetails />} />
        <Route path="/venues" element={<VenueManagement />} />
        <Route path="/umpires" element={<UmpireManagement />} />
        <Route path="/pages" element={<AdminPages />} />
        <Route path="/page/:slug" element={<Page />} />
        {/* <Route path="/player/:playerId" element={<PlayerDetail />} />  */}
     </Routes>
    </Router>
  );
}

export default App;
