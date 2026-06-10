const { User } = require("./models/User");
const { Room } = require("./models/Room");

const cache = {
  users: [],
  rooms: {},
  ready: false,
};

async function initPersistence() {
  const users = await User.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean();
  const rooms = await Room.find({}, { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }).lean();

  cache.users = users.map((u) => ({
    id: u.id,
    username: u.username,
    passwordHash: u.passwordHash,
    avatar: u.avatar || "?",
  }));

  cache.rooms = {};
  for (const room of rooms) {
    cache.rooms[room.id] = {
      id: room.id,
      hostName: room.hostName || "Host",
      access: {
        isPrivate: Boolean(room.access?.isPrivate),
        inviteOnly: Boolean(room.access?.inviteOnly),
        passwordHash: room.access?.passwordHash || null,
        inviteToken: room.access?.inviteToken || null,
      },
      state: {
        videoId: room.state?.videoId || null,
        playing: Boolean(room.state?.playing),
        timestamp: Number(room.state?.timestamp || 0),
        updatedAt: Number(room.state?.updatedAt || Date.now()),
      },
      messages: Array.isArray(room.messages) ? room.messages : [],
      watchHistory: Array.isArray(room.watchHistory) ? room.watchHistory : [],
    };
  }

  cache.ready = true;
  console.log(`Persistence loaded: ${cache.users.length} users, ${Object.keys(cache.rooms).length} rooms`);
}

function getUsers() {
  return [...cache.users];
}

function getRoom(roomId) {
  return cache.rooms[roomId] || null;
}

async function upsertUser(user) {
  const next = {
    id: user.id,
    username: user.username,
    passwordHash: user.passwordHash,
    avatar: user.avatar || "?",
  };

  const index = cache.users.findIndex((u) => u.id === next.id);
  if (index >= 0) cache.users[index] = next;
  else cache.users.push(next);

  await User.findOneAndUpdate(
    { id: next.id },
    next,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function ensureRoomRecord(roomId) {
  if (!cache.rooms[roomId]) {
    cache.rooms[roomId] = {
      id: roomId,
      hostName: "Host",
      access: {
        isPrivate: false,
        inviteOnly: false,
        passwordHash: null,
        inviteToken: null,
      },
      state: {
        videoId: null,
        playing: false,
        timestamp: 0,
        updatedAt: Date.now(),
      },
      messages: [],
      watchHistory: [],
    };
  }
  return cache.rooms[roomId];
}

async function persistRoom(roomId) {
  const room = ensureRoomRecord(roomId);

  await Room.findOneAndUpdate(
    { id: room.id },
    {
      id: room.id,
      hostName: room.hostName || "Host",
      access: room.access,
      state: room.state,
      messages: room.messages,
      watchHistory: room.watchHistory,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function upsertRoom(room) {
  const existing = ensureRoomRecord(room.id);
  cache.rooms[room.id] = {
    ...existing,
    id: room.id,
    hostName: room.hostName || existing.hostName || "Host",
    access: {
      isPrivate: Boolean(room.access?.isPrivate),
      inviteOnly: Boolean(room.access?.inviteOnly),
      passwordHash: room.access?.passwordHash || null,
      inviteToken: room.access?.inviteToken || null,
    },
    state: {
      ...existing.state,
      ...room.state,
      updatedAt: Date.now(),
    },
    messages: Array.isArray(existing.messages) ? existing.messages : [],
    watchHistory: Array.isArray(existing.watchHistory) ? existing.watchHistory : [],
  };

  await persistRoom(room.id);
}

async function updateRoomState(roomId, state) {
  const room = ensureRoomRecord(roomId);
  room.state = {
    ...room.state,
    ...state,
    updatedAt: Date.now(),
  };
  await persistRoom(roomId);
}

async function addRoomMessage(roomId, message) {
  const room = ensureRoomRecord(roomId);
  room.messages.push(message);
  if (room.messages.length > 500) {
    room.messages = room.messages.slice(-500);
  }
  await persistRoom(roomId);
}

async function addWatchEvent(roomId, event) {
  const room = ensureRoomRecord(roomId);
  room.watchHistory.push(event);
  if (room.watchHistory.length > 1000) {
    room.watchHistory = room.watchHistory.slice(-1000);
  }
  await persistRoom(roomId);
}

function getRecentMessages(roomId, limit = 50) {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.messages.slice(-Math.max(0, limit));
}

function getRecentWatchEvents(roomId, limit = 100) {
  const room = getRoom(roomId);
  if (!room) return [];
  return room.watchHistory.slice(-Math.max(0, limit));
}

module.exports = {
  initPersistence,
  getUsers,
  upsertUser,
  upsertRoom,
  getRoom,
  updateRoomState,
  addRoomMessage,
  addWatchEvent,
  getRecentMessages,
  getRecentWatchEvents,
};
