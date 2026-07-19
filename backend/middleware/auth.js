const jwt = require("jsonwebtoken");
const { verifyAccessToken } = require("../utils/tokens");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing admin token. Please log in again." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== "admin") throw new Error("Not an admin token");
    req.admin = true;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}

// Requires a valid customer access token (Authorization: Bearer <token>).
function requireCustomer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Please log in to continue." });
  }

  try {
    const payload = verifyAccessToken(token);
    if (payload.role !== "customer") throw new Error("Not a customer token");
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
}

// Attaches req.userId if a valid customer access token is present, but
// never blocks the request — used for routes customers can hit while logged out.
function optionalCustomer(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      if (payload.role === "customer") req.userId = payload.sub;
    } catch (err) {
      // ignore — treated as logged out
    }
  }
  next();
}

module.exports = { requireAdmin, requireCustomer, optionalCustomer };