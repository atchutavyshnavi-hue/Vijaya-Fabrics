const express = require("express");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const { requireCustomer } = require("../middleware/auth");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  refreshCookieOptions
} = require("../utils/tokens");

const router = express.Router();
const COOKIE_NAME = () => process.env.REFRESH_COOKIE_NAME || "vf_refresh";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PINCODE_RE = /^\d{6}$/;

function publicUser(userDoc) {
  return userDoc.toJSON();
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();
  res.cookie(COOKIE_NAME(), refreshToken, refreshCookieOptions());
  return accessToken;
}

// POST /api/auth/customer/signup
router.post("/signup", async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body || {};
    const errors = [];
    if (!name || !name.trim()) errors.push("Name is required.");
    if (!email || !EMAIL_RE.test(email.trim())) errors.push("A valid email is required.");
    if (!phone || !phone.trim() || phone.trim().length < 10) errors.push("A valid phone number is required.");
    if (!password || password.length < 6) errors.push("Password must be at least 6 characters.");
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      passwordHash
    });

    const accessToken = await issueSession(res, user);
    res.status(201).json({ accessToken, user: publicUser(user) });
  } catch (err) { next(err); }
});

// POST /api/auth/customer/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: "Incorrect email or password." });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Incorrect email or password." });

    const accessToken = await issueSession(res, user);
    res.json({ accessToken, user: publicUser(user) });
  } catch (err) { next(err); }
});

// POST /api/auth/customer/refresh — reads the httpOnly cookie, rotates the refresh
// token, and issues a fresh short-lived access token. Called silently on page load.
router.post("/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME()];
    if (!token) return res.status(401).json({ error: "Not logged in." });

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      res.clearCookie(COOKIE_NAME(), refreshCookieOptions());
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const user = await User.findById(payload.sub);
    if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hashToken(token)) {
      res.clearCookie(COOKIE_NAME(), refreshCookieOptions());
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const accessToken = await issueSession(res, user); // rotates the refresh token too
    res.json({ accessToken, user: publicUser(user) });
  } catch (err) { next(err); }
});

// POST /api/auth/customer/logout
router.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME()];
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await User.findByIdAndUpdate(payload.sub, { refreshTokenHash: null });
      } catch (err) {
        // token already invalid/expired — nothing to clear server-side
      }
    }
    res.clearCookie(COOKIE_NAME(), refreshCookieOptions());
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/auth/customer/me
router.get("/me", requireCustomer, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });
    res.json(publicUser(user));
  } catch (err) { next(err); }
});

// PUT /api/auth/customer/me — update personal info (name, phone)
router.put("/me", requireCustomer, async (req, res, next) => {
  try {
    const { name, phone } = req.body || {};
    const updates = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: "Name cannot be empty." });
      updates.name = name.trim();
    }
    if (phone !== undefined) {
      if (!phone.trim() || phone.trim().length < 10) return res.status(400).json({ error: "A valid phone number is required." });
      updates.phone = phone.trim();
    }
    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: "Account not found." });
    res.json(publicUser(user));
  } catch (err) { next(err); }
});

// PUT /api/auth/customer/me/password — change password
router.put("/me/password", requireCustomer, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Current and new password are required." });
    if (newPassword.length < 6) return res.status(400).json({ error: "New password must be at least 6 characters." });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) return res.status(401).json({ error: "Current password is incorrect." });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.refreshTokenHash = null; // force re-login everywhere after a password change
    await user.save();
    res.clearCookie(COOKIE_NAME(), refreshCookieOptions());
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ---------- Saved addresses ---------- */

function validateAddress(body, { partial = false } = {}) {
  const errors = [];
  const { line1, city, state, pincode } = body;
  if (!partial || line1 !== undefined) if (!line1 || !line1.trim()) errors.push("Address line 1 is required.");
  if (!partial || city !== undefined) if (!city || !city.trim()) errors.push("City is required.");
  if (!partial || state !== undefined) if (!state || !state.trim()) errors.push("State is required.");
  if (!partial || pincode !== undefined) if (!pincode || !PINCODE_RE.test(pincode.trim())) errors.push("A valid 6-digit PIN code is required.");
  return errors;
}

// POST /api/auth/customer/me/addresses
router.post("/me/addresses", requireCustomer, async (req, res, next) => {
  try {
    const errors = validateAddress(req.body || {});
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    const { label, line1, line2, city, state, pincode, isDefault } = req.body;
    if (isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => { a.isDefault = false; });
    }
    user.addresses.push({
      label: (label || "Home").trim(),
      line1: line1.trim(),
      line2: (line2 || "").trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      isDefault: !!isDefault || user.addresses.length === 0
    });
    await user.save();
    res.status(201).json(publicUser(user));
  } catch (err) { next(err); }
});

// PUT /api/auth/customer/me/addresses/:addressId
router.put("/me/addresses/:addressId", requireCustomer, async (req, res, next) => {
  try {
    const errors = validateAddress(req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ error: "Address not found." });

    const { label, line1, line2, city, state, pincode, isDefault } = req.body;
    if (label !== undefined) addr.label = label.trim();
    if (line1 !== undefined) addr.line1 = line1.trim();
    if (line2 !== undefined) addr.line2 = line2.trim();
    if (city !== undefined) addr.city = city.trim();
    if (state !== undefined) addr.state = state.trim();
    if (pincode !== undefined) addr.pincode = pincode.trim();
    if (isDefault) {
      user.addresses.forEach((a) => { a.isDefault = a._id.equals(addr._id); });
    }
    await user.save();
    res.json(publicUser(user));
  } catch (err) { next(err); }
});

// DELETE /api/auth/customer/me/addresses/:addressId
router.delete("/me/addresses/:addressId", requireCustomer, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    const addr = user.addresses.id(req.params.addressId);
    if (!addr) return res.status(404).json({ error: "Address not found." });

    const wasDefault = addr.isDefault;
    addr.deleteOne();
    if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    res.json(publicUser(user));
  } catch (err) { next(err); }
});

module.exports = router;
