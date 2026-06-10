const roomStore = require("./roomStore");
const { nanoid } = require("nanoid");
const bcrypt = require("bcryptjs");
const persistence = require("./persistenceStore");

// Creates a new room and returns it
function createRoom(hostId, hostName, access = {}) {
  const roomId = nanoid(6); // short, shareable ID like "xK9mPq"
  const room = roomStore.create(roomId, hostId, hostName, access);
  return room;
}

// Adds a user to an existing room. Returns null if room doesn't exist.
function joinRoom(roomId, userId, userName) {
  if (!roomStore.exists(roomId)) return null;
  return roomStore.addUser(roomId, userId, userName);
}

// Removes a user from a room.
// Returns { users, newHost } if room still exists, null if room was deleted.
function leaveRoom(roomId, userId) {
  const result = roomStore.removeUser(roomId, userId);
  if (!result) return null; // room was deleted (empty)
  return {
    users: result.room.users,
    newHost: result.newHost,
  };
}

// Returns a room by ID or null
function getRoom(roomId) {
  return roomStore.get(roomId);
}

// Checks if a room exists (used by REST route before socket join)
function roomExists(roomId) {
  return roomStore.exists(roomId);
}

async function canJoinRoom(roomId, { password, inviteToken } = {}) {
  const room = roomStore.get(roomId);
  if (!room) return { ok: false, error: "Room not found" };

  // The creator joining first should not be blocked by access checks.
  if (room.host === "pending") return { ok: true };

  if (room.access?.inviteOnly) {
    if (!inviteToken || inviteToken !== room.access.inviteToken) {
      return { ok: false, error: "This room requires an invite link" };
    }
  }

  if (room.access?.isPrivate && room.access?.passwordHash) {
    const matches = await bcrypt.compare(String(password || ""), room.access.passwordHash);
    if (!matches) {
      return { ok: false, error: "Wrong room password" };
    }
  }

  return { ok: true };
}

function getPublicRoomInfo(roomId) {
  const room = roomStore.get(roomId);
  if (!room) return null;

  return {
    id: room.id,
    access: {
      isPrivate: Boolean(room.access?.isPrivate),
      inviteOnly: Boolean(room.access?.inviteOnly),
      hasPassword: Boolean(room.access?.passwordHash),
    },
  };
}

function toClientRoom(room) {
  return {
    id: room.id,
    host: room.host,
    users: room.users,
    state: room.state,
    access: {
      isPrivate: Boolean(room.access?.isPrivate),
      inviteOnly: Boolean(room.access?.inviteOnly),
      hasPassword: Boolean(room.access?.passwordHash),
    },
    recentMessages: persistence.getRecentMessages(room.id, 50),
    recentWatchHistory: persistence.getRecentWatchEvents(room.id, 100),
  };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  roomExists,
  canJoinRoom,
  getPublicRoomInfo,
  toClientRoom,
};
