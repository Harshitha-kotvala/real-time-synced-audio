const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const port = 3000;

app.get("/", (req, res) => {
  res.send("Server is running");
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", (roomId) => {

    if (!rooms[roomId]) {
      rooms[roomId] = {
        host: socket.id,
        listeners: []
      };

      console.log(`Room ${roomId} created. Host: ${socket.id}`);
      socket.emit("role", "host");
    } 
    else {
      rooms[roomId].listeners.push(socket.id);

      console.log(`User ${socket.id} joined room ${roomId}`);
      socket.emit("role", "listener");
    }

    socket.join(roomId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
