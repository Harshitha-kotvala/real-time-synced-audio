const { TOKEN_COOKIE, verifyAuthToken } = require("../auth");

function requireAuth(req, res, next) {
  const token = req.cookies?.[TOKEN_COOKIE];
  const payload = verifyAuthToken(token);

  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.user = payload;
  next();
}

module.exports = { requireAuth };
