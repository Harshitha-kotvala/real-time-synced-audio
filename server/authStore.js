const persistence = require("./persistenceStore");

const usersByName = new Map();

function normalizeName(username) {
  return username.trim().toLowerCase();
}

function syncFromPersistence() {
  for (const user of persistence.getUsers()) {
    usersByName.set(normalizeName(user.username), user);
  }
}

async function createUser({ id, username, passwordHash, avatar }) {
  syncFromPersistence();
  const key = normalizeName(username);
  if (usersByName.has(key)) return null;

  const user = { id, username: username.trim(), passwordHash, avatar: avatar || "?" };
  usersByName.set(key, user);
  await persistence.upsertUser(user);
  return user;
}

function findByUsername(username) {
  syncFromPersistence();
  if (!username) return null;
  return usersByName.get(normalizeName(username)) || null;
}

module.exports = { createUser, findByUsername };
