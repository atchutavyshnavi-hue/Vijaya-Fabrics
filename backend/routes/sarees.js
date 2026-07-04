const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { requireAdmin } = require("../middleware/auth");
const { isValidCategory, isValidSubtype, getCategory } = require("../utils/categories");
const { generateSwatch } = require("../utils/swatch");
const db = require("../utils/db");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `saree-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }
    cb(null, true);
  }
});

function validateBody(body, { partial = false } = {}) {
  const errors = [];
  const { name, category, subtype, price, fabric, description } = body;

  if (!partial || name !== undefined) {
    if (!name || !name.trim()) errors.push("Name is required.");
  }
  if (!partial || category !== undefined) {
    if (!isValidCategory(category)) errors.push("A valid category is required.");
  }
  if (!partial || subtype !== undefined) {
    if (category && !isValidSubtype(category, subtype)) errors.push("Subtype does not match the selected category.");
  }
  if (!partial || price !== undefined) {
    if (price === undefined || isNaN(Number(price)) || Number(price) < 0) errors.push("Price must be a positive number.");
  }
  if (!partial || fabric !== undefined) {
    if (!fabric || !fabric.trim()) errors.push("Fabric is required.");
  }
  if (!partial || description !== undefined) {
    if (!description || !description.trim()) errors.push("Description is required.");
  }
  return errors;
}

/* ---------- Public routes ---------- */

// GET /api/sarees?category=&subtype=
router.get("/", (req, res) => {
  const { category, subtype } = req.query;
  const list = db.getAllSarees({ category, subtype });
  res.json(list);
});

// GET /api/sarees/:id
router.get("/:id", (req, res) => {
  const saree = db.getSareeById(req.params.id);
  if (!saree) return res.status(404).json({ error: "Saree not found." });
  res.json(saree);
});

/* ---------- Admin-only routes ---------- */

// POST /api/sarees  (multipart/form-data, field "image" optional)
router.post("/", requireAdmin, upload.single("image"), (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });

  const { name, category, subtype, price, fabric, description } = req.body;
  const featured = req.body.featured === "true" || req.body.featured === true;

  let image;
  if (req.file) {
    image = `/uploads/${req.file.filename}`;
  } else {
    const cat = getCategory(category);
    image = generateSwatch(name, cat.color, Date.now() % 1000);
  }

  const saree = db.addSaree({
    name: name.trim(),
    category,
    subtype,
    price: Number(price),
    fabric: fabric.trim(),
    description: description.trim(),
    image,
    featured
  });

  res.status(201).json(saree);
});

// PUT /api/sarees/:id  (multipart/form-data, field "image" optional)
router.put("/:id", requireAdmin, upload.single("image"), (req, res) => {
  const existing = db.getSareeById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Saree not found." });

  const errors = validateBody(req.body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(" ") });

  const updates = {};
  ["name", "category", "subtype", "fabric", "description"].forEach((key) => {
    if (req.body[key] !== undefined) updates[key] = req.body[key].trim();
  });
  if (req.body.price !== undefined) updates.price = Number(req.body.price);
  if (req.body.featured !== undefined) updates.featured = req.body.featured === "true" || req.body.featured === true;
  if (req.file) updates.image = `/uploads/${req.file.filename}`;

  const updated = db.updateSaree(req.params.id, updates);
  res.json(updated);
});

// DELETE /api/sarees/:id
router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.getSareeById(req.params.id);
  if (!existing) return res.status(404).json({ error: "Saree not found." });
  db.deleteSaree(req.params.id);
  res.json({ success: true });
});

// POST /api/sarees/reset/seed  — restore the original sample catalog
router.post("/reset/seed", requireAdmin, (req, res) => {
  const sarees = db.resetToSeed();
  res.json(sarees);
});

module.exports = router;
