const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Admin = require("../models/admin");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/login  { email, password }
// Real admin accounts, hashed passwords — no more single shared env password.
// (The first admin account is bootstrapped automatically on server startup
// from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists yet — see server.js.)
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const admin = await Admin.findOne({ email: email.trim().toLowerCase() });
    if (!admin) return res.status(401).json({ error: "Incorrect email or password." });

    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) return res.status(401).json({ error: "Incorrect email or password." });

    const token = jwt.sign(
      { role: "admin", sub: admin._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    res.json({ token, admin: { id: admin._id.toString(), email: admin.email, name: admin.name } });
  } catch (err) { next(err); }
});

// PUT /api/auth/change-password — an already-logged-in admin changes their own password
router.put("/change-password", requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(404).json({ error: "Admin account not found." });

    const match = await bcrypt.compare(currentPassword, admin.passwordHash);
    if (!match) return res.status(401).json({ error: "Current password is incorrect." });

    admin.passwordHash = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;