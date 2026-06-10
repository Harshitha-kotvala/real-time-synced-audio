require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { connectDatabase } = require("./db");
const persistence = require("./persistenceStore");

const roomRoutes = require("./routes/rooms");
const authRoutes = require("./routes/auth");
const { requireAuth } = require("./middleware/requireAuth");
const { handleSync } = require("./handles/syncHandler");
const { handleChat } = require("./handles/chatHandler");
const roomManager = require("./roomManager");

const app = express();
const httpServer = http.createServer(app);

// Socket.IO CORS
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://real-time-synced-audio.vercel.app",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Express CORS
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://real-time-synced-audio.vercel.app",
    ],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/room", requireAuth, roomRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on(
    "join-room",
    async ({ roomId, userName, password, inviteToken }) => {
      const access = await roomManager.canJoinRoom(roomId, {
        password,
        inviteToken,
      });

      if (!access.ok) {
        socket.emit("error", { message: access.error });
        return;
      }

      const room = roomManager.joinRoom(roomId, socket.id, userName);

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userName = userName;

      socket.to(roomId).emit("user-joined", {
        userId: socket.id,
        userName,
        users: room.users,
      });

      socket.emit("room-joined", {
        room: roomManager.toClientRoom(room),
        isHost: room.host === socket.id,
      });

      const hostSocketId = room.host;

      if (hostSocketId && hostSocketId !== socket.id) {
        io.to(hostSocketId).emit("request-sync", {
          requesterId: socket.id,
        });
      }
    }
  );

  socket.on("sync-response", ({ requesterId, timestamp, playing }) => {
    io.to(requesterId).emit("sync-state", {
      timestamp,
      playing,
      serverTime: Date.now(),
    });
  });

  handleSync(io, socket);
  handleChat(io, socket);

  socket.on("disconnect", () => {
    const { roomId, userName } = socket.data;

    if (!roomId) return;

    const result = roomManager.leaveRoom(roomId, socket.id);

    if (!result) return;

    if (result.newHost) {
      io.to(roomId).emit("host-changed", {
        newHostId: result.newHost,
        users: result.users,
      });
    }

    io.to(roomId).emit("user-left", {
      userId: socket.id,
      userName,
      users: result.users,
    });

    console.log(
      `Socket disconnected: ${socket.id} left room ${roomId}`
    );
  });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectDatabase();
  await persistence.initPersistence();

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});