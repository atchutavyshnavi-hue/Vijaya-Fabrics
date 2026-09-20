const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { requireAdmin, optionalAdmin } = require("../middleware/auth");
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
  const { name, category, subtype, price, fabric, description, stock, bulkPrice } = body;

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
  if (stock !== undefined && (isNaN(Number(stock)) || Number(stock) < 0)) {
    errors.push("Stock must be zero or a positive number.");
  }
  if (bulkPrice !== undefined && bulkPrice !== "" && (isNaN(Number(bulkPrice)) || Number(bulkPrice) < 0)) {
    errors.push("Bulk price must be zero or a positive number.");
  }
  return errors;
}

// Accepts colours as a real array (JSON body) or a comma-separated string
// (multipart/form-data can't send arrays directly).
function parseColours(input) {
  if (Array.isArray(input)) return input.map((c) => String(c).trim()).filter(Boolean);
  if (typeof input === "string" && input.trim()) {
    return input.split(",").map((c) => c.trim()).filter(Boolean);
  }
  return [];
}

function parseBales(body) {
  const available = body.balesAvailable !== undefined ? Number(body.balesAvailable) : undefined;
  const piecesPerBale = body.piecesPerBale !== undefined ? Number(body.piecesPerBale) : undefined;
  const costPerBale = body.costPerBale !== undefined ? Number(body.costPerBale) : undefined;
  if (available === undefined && piecesPerBale === undefined && costPerBale === undefined) return undefined;
  return {
    available: isNaN(available) ? 0 : available,
    piecesPerBale: isNaN(piecesPerBale) ? 0 : piecesPerBale,
    costPerBale: isNaN(costPerBale) ? 0 : costPerBale
  };
}

// Masks exact stock for non-admin callers: >5 shows no number at all,
// 1-5 shows the countdown label, 0 shows "Out of stock". Admins (and the
// admin panel) get the real numbers so they can manage inventory.
function shapeForResponse(saree, isAdmin) {
  const obj = typeof saree.toJSON === "function" ? saree.toJSON() : saree;
  const stock = obj.stock ?? 0;
  const stockLabel = stock <= 0 ? "Out of stock" : stock <= 5 ? `${stock} left in stock` : "In stock";

  if (isAdmin) {
    return { ...obj, stockLabel };
  }

  const { stock: _s, bales: _b, bulkPrice: _bp, ...customerSafe } = obj;
  return {
    ...customerSafe,
    inStock: stock > 0,
    stockLabel,
    // exact count only surfaced to the customer once it's low enough to matter
    lowStockCount: stock > 0 && stock <= 5 ? stock : null
  };
}

/* ---------- Public routes ---------- */

// GET /api/sarees?category=&subtype=
router.get("/", optionalAdmin, async (req, res, next) => {
  try {
    const { category, subtype } = req.query;
    const list = await db.getAllSarees({ category, subtype });
    const visible = req.admin ? list : list.filter((s) => s.active !== false);
    res.json(visible.map((s) => shapeForResponse(s, req.admin)));
  } catch (err) { next(err); }
});

// GET /api/sarees/:id
router.get("/:id", optionalAdmin, async (req, res, next) => {
  try {
    const saree = await db.getSareeById(req.params.id);
    if (!saree) return res.status(404).json({ error: "Saree not found." });
    if (!req.admin && saree.active === false) return res.status(404).json({ error: "Saree not found." });
    res.json(shapeForResponse(saree, req.admin));
  } catch (err) { next(err); }
});

/* ---------- Admin-only routes ---------- */

// POST /api/sarees  (multipart/form-data, field "image" optional)
router.post("/", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const errors = validateBody(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const { name, category, subtype, price, fabric, description } = req.body;
    const featured = req.body.featured === "true" || req.body.featured === true;
    const active = req.body.active === undefined ? true : (req.body.active === "true" || req.body.active === true);

    let image;
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    } else {
      const cat = getCategory(category);
      image = generateSwatch(name, cat.color, Date.now() % 1000);
    }

    const bales = parseBales(req.body);

    const saree = await db.addSaree({
      name: name.trim(),
      category,
      subtype,
      price: Number(price),
      bulkPrice: req.body.bulkPrice !== undefined && req.body.bulkPrice !== "" ? Number(req.body.bulkPrice) : null,
      fabric: fabric.trim(),
      description: description.trim(),
      image,
      featured,
      active,
      colours: parseColours(req.body.colours),
      stock: req.body.stock !== undefined ? Number(req.body.stock) : 0,
      ...(bales ? { bales } : {})
    });

    res.status(201).json(shapeForResponse(saree, true));
  } catch (err) { next(err); }
});

// PUT /api/sarees/:id  (multipart/form-data, field "image" optional)
router.put("/:id", requireAdmin, upload.single("image"), async (req, res, next) => {
  try {
    const existing = await db.getSareeById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Saree not found." });

    const errors = validateBody(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(" ") });

    const updates = {};
    ["name", "category", "subtype", "fabric", "description"].forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key].trim();
    });
    if (req.body.price !== undefined) updates.price = Number(req.body.price);
    if (req.body.bulkPrice !== undefined) updates.bulkPrice = req.body.bulkPrice === "" ? null : Number(req.body.bulkPrice);
    if (req.body.featured !== undefined) updates.featured = req.body.featured === "true" || req.body.featured === true;
    if (req.body.active !== undefined) updates.active = req.body.active === "true" || req.body.active === true;
    if (req.body.stock !== undefined) updates.stock = Number(req.body.stock);
    if (req.body.colours !== undefined) updates.colours = parseColours(req.body.colours);
    const bales = parseBales(req.body);
    if (bales) updates.bales = bales;
    if (req.file) updates.image = `/uploads/${req.file.filename}`;

    const updated = await db.updateSaree(req.params.id, updates);
    res.json(shapeForResponse(updated, true));
  } catch (err) { next(err); }
});

// DELETE /api/sarees/:id
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const existing = await db.getSareeById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Saree not found." });
    await db.deleteSaree(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/sarees/reset/seed  — restore the original sample catalog
router.post("/reset/seed", requireAdmin, async (req, res, next) => {
  try {
    const sarees = await db.resetToSeed();
    res.json(sarees.map((s) => shapeForResponse(s, true)));
  } catch (err) { next(err); }
});

module.exports = router;