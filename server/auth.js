const jwt = require("jsonwebtoken");

const TOKEN_COOKIE = "auth_token";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: IS_PRODUCTION ? "none" : "lax",
    secure: IS_PRODUCTION,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

function signAuthToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function setAuthCookie(res, token) {
  res.cookie(TOKEN_COOKIE, token, getAuthCookieOptions());
}

function clearAuthCookie(res) {
  res.clearCookie(TOKEN_COOKIE, getAuthCookieOptions());
}

module.exports = {
  TOKEN_COOKIE,
  signAuthToken,
  verifyAuthToken,
  setAuthCookie,
  clearAuthCookie,
};
