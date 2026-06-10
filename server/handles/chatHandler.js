const persistence = require("../persistenceStore");

function handleChat(io, socket) {
  socket.on("chat-message", ({ text }) => {
    const roomId = socket.data.roomId;
    const userName = socket.data.userName;

    if (!roomId || !text || text.trim().length === 0) return;

    // Trim and cap message length
    const sanitized = text.trim().slice(0, 300);

    const payload = {
      userId: socket.id,
      userName,
      text: sanitized,
      sentAt: Date.now(),
    };

    persistence.addRoomMessage(roomId, payload).catch((err) => {
      console.error("Failed to persist chat message:", err.message);
    });

    // Broadcast to entire room including sender so everyone's UI updates uniformly
    io.to(roomId).emit("chat-message", payload);
  });
}

module.exports = { handleChat };
