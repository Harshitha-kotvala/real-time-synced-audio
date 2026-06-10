const express = require("express");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { createUser, findByUsername } = require("../authStore");
const { clearAuthCookie, setAuthCookie, signAuthToken, TOKEN_COOKIE, verifyAuthToken } = require("../auth");

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar || "?",
  };
}

router.post("/register", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  const avatar = String(req.body?.avatar || "?").trim().slice(0, 2);

  if (!username || username.length < 3 || username.length > 24) {
    return res.status(400).json({ error: "Username must be 3-24 characters" });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existing = findByUsername(username);
  if (existing) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser({
    id: nanoid(10),
    username,
    passwordHash,
    avatar: avatar || "?",
  });
  if (!user) {
    return res.status(409).json({ error: "Username already exists" });
  }

  const token = signAuthToken({ id: user.id, username: user.username, avatar: user.avatar });
  setAuthCookie(res, token);
  res.status(201).json({ user: sanitizeUser(user) });
});

router.post("/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  const user = findByUsername(username);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = signAuthToken({ id: user.id, username: user.username, avatar: user.avatar });
  setAuthCookie(res, token);
  res.json({ user: sanitizeUser(user) });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.[TOKEN_COOKIE];
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  res.json({
    user: {
      id: payload.id,
      username: payload.username,
      avatar: payload.avatar || "?",
    },
  });
});

module.exports = router;
