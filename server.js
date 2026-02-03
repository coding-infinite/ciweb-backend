import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

// ===== CHAT MATCHING =====
let waitingUser = null;

// ===== GAME STATE =====
const games = {}; // roomId -> game

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  // START CHAT
  socket.on("start_chat", () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      const roomId = `room_${waitingUser.id}_${socket.id}`;

      socket.join(roomId);
      waitingUser.join(roomId);

      socket.emit("chat_started", roomId);
      waitingUser.emit("chat_started", roomId);

      waitingUser = null;
    } else {
      waitingUser = socket;
    }
  });

  // CHAT MESSAGE
  socket.on("message", ({ roomId, message }) => {
    socket.to(roomId).emit("message", message);
  });

  // TYPING
  socket.on("typing", (roomId) => {
    socket.to(roomId).emit("typing");
  });

  // ===== GAME =====
  socket.on("start_game", (roomId) => {
    games[roomId] = {
      board: Array(9).fill(null),
      turn: socket.id
    };
    io.to(roomId).emit("game_started", games[roomId]);
  });

  socket.on("make_move", ({ roomId, index }) => {
    const game = games[roomId];
    if (!game) return;
    if (game.board[index]) return;
    if (game.turn !== socket.id) return;

    game.board[index] = socket.id;
    game.turn = null;

    io.to(roomId).emit("game_update", game);
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    if (waitingUser?.id === socket.id) {
      waitingUser = null;
    }
    console.log("Disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
