const express = require("express");
const Cart = require("../models/Cart");
const Saree = require("../models/Saree");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

async function getOrCreateCart(userId) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

async function serializeCart(cart) {
  const populated = await cart.populate("items.saree");
  const items = populated.items
    .filter((it) => !!it.saree) // drop items whose saree was deleted from the catalog
    .map((it) => {
      const saree = it.saree.toJSON();
      return {
        saree,
        qty: it.qty,
        lineTotal: saree.price * it.qty
      };
    });
  const total = items.reduce((sum, it) => sum + it.lineTotal, 0);
  return { id: cart._id.toString(), items, total, itemCount: items.reduce((n, it) => n + it.qty, 0) };
}

// GET /api/cart
router.get("/", requireCustomer, async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.userId);
    res.json(await serializeCart(cart));
  } catch (err) { next(err); }
});

// POST /api/cart  { sareeId, qty }
router.post("/", requireCustomer, async (req, res, next) => {
  try {
    const { sareeId, qty } = req.body || {};
    const quantity = Math.max(1, Number(qty) || 1);
    if (!sareeId) return res.status(400).json({ error: "sareeId is required." });

    const saree = await Saree.findById(sareeId);
    if (!saree) return res.status(404).json({ error: "Saree not found." });

    const cart = await getOrCreateCart(req.userId);
    const existing = cart.items.find((it) => it.saree.toString() === sareeId);
    if (existing) {
      existing.qty += quantity;
    } else {
      cart.items.push({ saree: sareeId, qty: quantity });
    }
    await cart.save();
    res.status(201).json(await serializeCart(cart));
  } catch (err) { next(err); }
});

// PUT /api/cart/:sareeId  { qty }
router.put("/:sareeId", requireCustomer, async (req, res, next) => {
  try {
    const { qty } = req.body || {};
    const quantity = Number(qty);
    if (!quantity || quantity < 1) return res.status(400).json({ error: "qty must be at least 1." });

    const cart = await getOrCreateCart(req.userId);
    const item = cart.items.find((it) => it.saree.toString() === req.params.sareeId);
    if (!item) return res.status(404).json({ error: "Item not in cart." });
    item.qty = quantity;
    await cart.save();
    res.json(await serializeCart(cart));
  } catch (err) { next(err); }
});

// DELETE /api/cart/:sareeId
router.delete("/:sareeId", requireCustomer, async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.userId);
    cart.items = cart.items.filter((it) => it.saree.toString() !== req.params.sareeId);
    await cart.save();
    res.json(await serializeCart(cart));
  } catch (err) { next(err); }
});

// DELETE /api/cart
router.delete("/", requireCustomer, async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.userId);
    cart.items = [];
    await cart.save();
    res.json(await serializeCart(cart));
  } catch (err) { next(err); }
});

module.exports = router;