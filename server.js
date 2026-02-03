import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// waiting users queue
let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("start_chat", () => {
    if (waitingUser) {
      const roomId = `room-${socket.id}-${waitingUser.id}`;

      socket.join(roomId);
      waitingUser.join(roomId);

      socket.emit("chat_started", roomId);
      waitingUser.emit("chat_started", roomId);

      waitingUser = null;
    } else {
      waitingUser = socket;
    }
  });

  socket.on("message", ({ roomId, message }) => {
    socket.to(roomId).emit("message", message);
  });

  socket.on("typing", (roomId) => {
    socket.to(roomId).emit("typing");
  });

  socket.on("disconnect", () => {
    if (waitingUser?.id === socket.id) {
      waitingUser = null;
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});

