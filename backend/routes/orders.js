const express = require("express");
const { Order } = require("../models/Order");
const Cart = require("../models/Cart");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VF-${ts}-${rand}`;
}

const PINCODE_RE = /^\d{6}$/;

function validateShipping(addr) {
  const errors = [];
  if (!addr) return ["Shipping address is required."];
  if (!addr.name || !addr.name.trim()) errors.push("Recipient name is required.");
  if (!addr.phone || addr.phone.trim().length < 10) errors.push("A valid phone number is required.");
  if (!addr.line1 || !addr.line1.trim()) errors.push("Address line 1 is required.");
  if (!addr.city || !addr.city.trim()) errors.push("City is required.");
  if (!addr.state || !addr.state.trim()) errors.push("State is required.");
  if (!addr.pincode || !PINCODE_RE.test(String(addr.pincode).trim())) errors.push("A valid 6-digit PIN code is required.");
  return errors;
}

// POST /api/orders — place an order from the current cart
router.post("/", requireCustomer, async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod } = req.body || {};
    const shippingErrors = validateShipping(shippingAddress);
    if (shippingErrors.length) return res.status(400).json({ error: shippingErrors.join(" ") });

    const cart = await Cart.findOne({ user: req.userId }).populate("items.saree");
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const items = cart.items
      .filter((it) => !!it.saree)
      .map((it) => ({
        saree: it.saree._id,
        name: it.saree.name,
        image: it.saree.image,
        price: it.saree.price,
        qty: it.qty
      }));
    if (items.length === 0) return res.status(400).json({ error: "Your cart is empty." });

    const totalAmount = items.reduce((sum, it) => sum + it.price * it.qty, 0);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.userId,
      items,
      shippingAddress: {
        name: shippingAddress.name.trim(),
        phone: shippingAddress.phone.trim(),
        line1: shippingAddress.line1.trim(),
        line2: (shippingAddress.line2 || "").trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        pincode: String(shippingAddress.pincode).trim()
      },
      totalAmount,
      paymentMethod: paymentMethod || "Cash on Delivery",
      paymentStatus: "Pending",
      orderStatus: "Received",
      statusHistory: [{ status: "Received" }]
    });

    cart.items = [];
    await cart.save();

    res.status(201).json(order.toJSON());
  } catch (err) { next(err); }
});

// GET /api/orders — order history for the logged-in customer
router.get("/", requireCustomer, async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(orders.map((o) => o.toJSON()));
  } catch (err) { next(err); }
});

// GET /api/orders/:id — single order (tracking detail)
router.get("/:id", requireCustomer, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json(order.toJSON());
  } catch (err) { next(err); }
});

module.exports = router;
