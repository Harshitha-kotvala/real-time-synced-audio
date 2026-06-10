const express = require("express");
const router = express.Router();
const roomManager = require("../roomManager");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");

// POST /room/create
// Called from the HomePage before the socket connects.
// Creates the room in the store so the host's socket can join it.
router.post("/create", async (req, res) => {
  const hostName = req.user?.username;
  const privacy = String(req.body?.privacy || "public").toLowerCase();
  const password = String(req.body?.password || "");
  const inviteOnly = Boolean(req.body?.inviteOnly);

  if (!["public", "private"].includes(privacy)) {
    return res.status(400).json({ error: "privacy must be public or private" });
  }

  if (privacy === "private" && password.length > 0 && password.length < 4) {
    return res.status(400).json({ error: "Room password must be at least 4 characters" });
  }

  const passwordHash =
    privacy === "private" && password.length > 0 ? await bcrypt.hash(password, 10) : null;
  const inviteToken = inviteOnly ? nanoid(12) : null;

  // Room is created with a placeholder hostId ("pending").
  // The real socket ID replaces this when the host's socket joins.
  // We just need the room to exist before the socket handshake.
  const room = roomManager.createRoom("pending", hostName, {
    isPrivate: privacy === "private",
    passwordHash,
    inviteOnly,
    inviteToken,
  });

  const clientBase = process.env.CLIENT_URL || "http://localhost:5173";
  const inviteUrl = inviteToken
    ? `${clientBase}/room/${room.id}?invite=${inviteToken}`
    : `${clientBase}/room/${room.id}`;

  res.json({
    roomId: room.id,
    access: roomManager.getPublicRoomInfo(room.id).access,
    inviteToken,
    inviteUrl,
  });
});

// GET /room/:id/exists
// Called by a joining user to validate the room before entering their name.
router.get("/:id/exists", (req, res) => {
  const room = roomManager.getPublicRoomInfo(req.params.id);
  if (!room) {
    return res.status(404).json({ exists: false, error: "Room not found" });
  }
  res.json({ exists: true, access: room.access });
});

module.exports = router;
