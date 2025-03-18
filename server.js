const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");
const teamRoutes = require("./routes/teamRoutes");
const playerRoutes = require("./routes/playerRoutes");
const matchRoutes = require("./routes/matchRoutes");
const scoreRoutes = require("./routes/scoreRoutes");
const userRoutes = require("./routes/users");
const tournamentRoutes = require("./routes/tournaments");
const venueRoutes = require("./routes/venueRoutes");
const umpireRoutes = require("./routes/umpireRoutes");
const authr = require("./routes/auth");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use("/api/teams", teamRoutes);
app.use("/api/players", playerRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/scores", scoreRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authr);
app.use("/api/venues", venueRoutes);
app.use("/api/umpires", umpireRoutes);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinMatch", (matchId) => {
    socket.join(matchId);
    console.log(`User ${socket.id} joined match room: ${matchId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Function to emit match updates
const emitMatchUpdate = (match) => {
  io.emit("matchUpdate", match); // Or io.to(match._id).emit(...) with rooms
  console.log("Emitted matchUpdate:", match);
};

// Function to emit score updates
const emitScoreUpdate = (score) => {
  io.emit("scoreUpdate", score); // Or io.to(score.match).emit(...) with rooms
  console.log("Emitted scoreUpdate:", score);
};

app.set("emitMatchUpdate", emitMatchUpdate);
app.set("emitScoreUpdate", emitScoreUpdate);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));