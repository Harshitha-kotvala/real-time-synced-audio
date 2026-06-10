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

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://real-time-synced-audio.vercel.app"
  ],
  credentials: true
}))
app.use(cookieParser());
app.use(express.json());
app.use("/auth", authRoutes);
app.use("/room", requireAuth, roomRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // User joins a room
  socket.on("join-room", async ({ roomId, userName, password, inviteToken }) => {
    const access = await roomManager.canJoinRoom(roomId, { password, inviteToken });
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

    // Tell everyone else someone joined
    socket.to(roomId).emit("user-joined", {
      userId: socket.id,
      userName,
      users: room.users,
    });

    // Send the new user the current room state so they can sync
    socket.emit("room-joined", {
      room: roomManager.toClientRoom(room),
      isHost: room.host === socket.id,
    });

    // Ask host for latest timestamp (more accurate than stored state)
    const hostSocketId = room.host;
    if (hostSocketId && hostSocketId !== socket.id) {
      io.to(hostSocketId).emit("request-sync", { requesterId: socket.id });
    }
  });

  // Host sends back current state when a new user joins
  socket.on("sync-response", ({ requesterId, timestamp, playing }) => {
    io.to(requesterId).emit("sync-state", {
      timestamp,
      playing,
      serverTime: Date.now(),
    });
  });

  // Sync handlers (play, pause, seek, video-change)
  handleSync(io, socket);

  // Chat handlers
  handleChat(io, socket);

  socket.on("disconnect", () => {
    const { roomId, userName } = socket.data;
    if (!roomId) return;

    const result = roomManager.leaveRoom(roomId, socket.id);
    if (!result) return;

    // If the host left, assign a new one
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

    console.log(`Socket disconnected: ${socket.id} left room ${roomId}`);
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
