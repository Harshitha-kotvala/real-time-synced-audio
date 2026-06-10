const persistence = require("./persistenceStore");

// In-memory active rooms. Persistent snapshots are stored in persistenceStore.
const rooms = new Map();

function hydrateFromPersistence(roomId) {
  const saved = persistence.getRoom(roomId);
  if (!saved) return null;

  const room = {
    id: saved.id,
    host: "pending",
    users: [{ id: "pending", userName: saved.hostName || "Host" }],
    access: {
      isPrivate: Boolean(saved.access?.isPrivate),
      inviteOnly: Boolean(saved.access?.inviteOnly),
      passwordHash: saved.access?.passwordHash || null,
      inviteToken: saved.access?.inviteToken || null,
    },
    state: {
      videoId: saved.state?.videoId || null,
      playing: Boolean(saved.state?.playing),
      timestamp: Number(saved.state?.timestamp || 0),
      updatedAt: saved.state?.updatedAt || Date.now(),
    },
  };

  rooms.set(roomId, room);
  return room;
}

function get(roomId) {
  if (rooms.has(roomId)) return rooms.get(roomId);
  return hydrateFromPersistence(roomId);
}

function create(roomId, hostId, hostName, access = {}) {
  const room = {
    id: roomId,
    host: hostId,
    users: [{ id: hostId, userName: hostName }],
    access: {
      isPrivate: Boolean(access.isPrivate),
      inviteOnly: Boolean(access.inviteOnly),
      passwordHash: access.passwordHash || null,
      inviteToken: access.inviteToken || null,
    },
    state: {
      videoId: null,
      playing: false,
      timestamp: 0,
      updatedAt: Date.now(),
    },
  };

  rooms.set(roomId, room);
  persistence.upsertRoom({
    id: room.id,
    hostName,
    access: room.access,
    state: room.state,
  }).catch((err) => {
    console.error("Failed to persist room create:", err.message);
  });

  return room;
}

function updateState(roomId, patch, meta = {}) {
  const room = get(roomId);
  if (!room) return null;

  room.state = { ...room.state, ...patch, updatedAt: Date.now() };

  persistence.updateRoomState(roomId, room.state).catch((err) => {
    console.error("Failed to persist room state:", err.message);
  });
  if (meta.event) {
    persistence.addWatchEvent(roomId, {
      ...meta.event,
      at: Date.now(),
    }).catch((err) => {
      console.error("Failed to persist watch event:", err.message);
    });
  }

  return room;
}

function addUser(roomId, userId, userName) {
  const room = get(roomId);
  if (!room) return null;

  // Rooms are created before the host socket connects.
  // When the creator joins for the first time, replace the placeholder host.
  if (room.host === "pending") {
    room.host = userId;
    room.users = [{ id: userId, userName }];
    return room;
  }

  if (!room.users.find((u) => u.id === userId)) {
    room.users.push({ id: userId, userName });
  }

  return room;
}

function removeUser(roomId, userId) {
  const room = get(roomId);
  if (!room) return null;

  room.users = room.users.filter((u) => u.id !== userId);

  if (room.users.length === 0) {
    rooms.delete(roomId);
    return null;
  }

  let newHost = null;
  if (room.host === userId) {
    room.host = room.users[0].id;
    newHost = room.host;
  }

  return { room, newHost };
}

function exists(roomId) {
  return rooms.has(roomId) || Boolean(persistence.getRoom(roomId));
}

function deleteRoom(roomId) {
  rooms.delete(roomId);
}

module.exports = { get, create, updateState, addUser, removeUser, exists, deleteRoom };
