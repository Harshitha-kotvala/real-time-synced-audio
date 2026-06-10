const roomStore = require("../roomStore");

// Only the host can trigger sync events.
// This guard runs before every action.
function isHost(socket, roomId) {
  const room = roomStore.get(roomId);
  return room && room.host === socket.id;
}

function handleSync(io, socket) {
  // Host changed the video (pasted a new YouTube link)
  socket.on("video-change", ({ videoId }) => {
    const roomId = socket.data.roomId;
    if (!isHost(socket, roomId)) return;

    roomStore.updateState(
      roomId,
      { videoId, playing: false, timestamp: 0 },
      { event: { action: "video-change", videoId, by: socket.data.userName } }
    );

    // Broadcast to everyone INCLUDING host so all UIs update
    io.to(roomId).emit("video-changed", {
      videoId,
      serverTime: Date.now(),
    });
  });

  // Host pressed play
  socket.on("play", ({ timestamp }) => {
    const roomId = socket.data.roomId;
    if (!isHost(socket, roomId)) return;

    roomStore.updateState(
      roomId,
      { playing: true, timestamp },
      { event: { action: "play", timestamp, by: socket.data.userName } }
    );

    // Broadcast to everyone EXCEPT the host (host already played)
    socket.to(roomId).emit("sync-state", {
      action: "play",
      timestamp,
      serverTime: Date.now(),
    });
  });

  // Host pressed pause
  socket.on("pause", ({ timestamp }) => {
    const roomId = socket.data.roomId;
    if (!isHost(socket, roomId)) return;

    roomStore.updateState(
      roomId,
      { playing: false, timestamp },
      { event: { action: "pause", timestamp, by: socket.data.userName } }
    );

    socket.to(roomId).emit("sync-state", {
      action: "pause",
      timestamp,
      serverTime: Date.now(),
    });
  });

  // Host seeked to a new position
  socket.on("seek", ({ timestamp }) => {
    const roomId = socket.data.roomId;
    if (!isHost(socket, roomId)) return;

    const room = roomStore.get(roomId);
    roomStore.updateState(
      roomId,
      { timestamp, playing: room.state.playing },
      { event: { action: "seek", timestamp, by: socket.data.userName } }
    );

    socket.to(roomId).emit("sync-state", {
      action: "seek",
      timestamp,
      playing: room.state.playing,
      serverTime: Date.now(),
    });
  });
}

module.exports = { handleSync };
