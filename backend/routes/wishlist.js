const express = require("express");
const Wishlist = require("../models/Wishlist");
const Cart = require("../models/Cart");
const Saree = require("../models/Saree");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

async function getOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId });
  if (!wishlist) wishlist = await Wishlist.create({ user: userId, sarees: [] });
  return wishlist;
}

// Wishlist is customer-only, so it always gets the customer-safe (masked)
// stock shape — never the exact count, same rule as the public catalog.
function shapeSareeForWishlist(saree) {
  const obj = saree.toJSON();
  const stock = obj.stock ?? 0;
  const { stock: _s, bales: _b, bulkPrice: _bp, ...customerSafe } = obj;
  return {
    ...customerSafe,
    inStock: stock > 0,
    stockLabel: stock <= 0 ? "Out of stock" : stock <= 5 ? `${stock} left in stock` : "In stock",
    lowStockCount: stock > 0 && stock <= 5 ? stock : null
  };
}

async function serializeWishlist(wishlist) {
  const populated = await wishlist.populate("sarees");
  const items = populated.sarees
    .filter((s) => !!s && s.active !== false) // drop deleted/deactivated sarees quietly
    .map(shapeSareeForWishlist);
  return { id: wishlist._id.toString(), items, count: items.length };
}

// GET /api/wishlist
router.get("/", requireCustomer, async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.userId);
    res.json(await serializeWishlist(wishlist));
  } catch (err) { next(err); }
});

// POST /api/wishlist  { sareeId }
router.post("/", requireCustomer, async (req, res, next) => {
  try {
    const { sareeId } = req.body || {};
    if (!sareeId) return res.status(400).json({ error: "sareeId is required." });

    const saree = await Saree.findById(sareeId);
    if (!saree || saree.active === false) return res.status(404).json({ error: "Saree not found." });

    const wishlist = await getOrCreateWishlist(req.userId);
    const alreadyIn = wishlist.sarees.some((id) => id.toString() === sareeId);
    if (!alreadyIn) {
      wishlist.sarees.push(sareeId);
      await wishlist.save();
    }
    res.status(201).json(await serializeWishlist(wishlist));
  } catch (err) { next(err); }
});

// DELETE /api/wishlist/:sareeId
router.delete("/:sareeId", requireCustomer, async (req, res, next) => {
  try {
    const wishlist = await getOrCreateWishlist(req.userId);
    wishlist.sarees = wishlist.sarees.filter((id) => id.toString() !== req.params.sareeId);
    await wishlist.save();
    res.json(await serializeWishlist(wishlist));
  } catch (err) { next(err); }
});

// POST /api/wishlist/:sareeId/move-to-cart  { qty? }
// Adds the item to the cart (same stock rules as a normal add-to-cart) and,
// only once that succeeds, removes it from the wishlist.
router.post("/:sareeId/move-to-cart", requireCustomer, async (req, res, next) => {
  try {
    const sareeId = req.params.sareeId;
    const quantity = Math.max(1, Number((req.body || {}).qty) || 1);

    const saree = await Saree.findById(sareeId);
    if (!saree || saree.active === false) return res.status(404).json({ error: "Saree not found." });

    let cart = await Cart.findOne({ user: req.userId });
    if (!cart) cart = await Cart.create({ user: req.userId, items: [] });

    const existing = cart.items.find((it) => it.saree.toString() === sareeId);
    const wantedTotal = (existing ? existing.qty : 0) + quantity;

    if (saree.stock <= 0) {
      return res.status(400).json({ error: `"${saree.name}" is currently out of stock.` });
    }
    if (wantedTotal > saree.stock) {
      return res.status(400).json({
        error: `Only ${saree.stock} piece${saree.stock === 1 ? "" : "s"} of "${saree.name}" are currently available.`,
        available: saree.stock
      });
    }

    if (existing) existing.qty = wantedTotal;
    else cart.items.push({ saree: sareeId, qty: quantity });
    await cart.save();

    const wishlist = await getOrCreateWishlist(req.userId);
    wishlist.sarees = wishlist.sarees.filter((id) => id.toString() !== sareeId);
    await wishlist.save();

    res.json(await serializeWishlist(wishlist));
  } catch (err) { next(err); }
});

module.exports = router;