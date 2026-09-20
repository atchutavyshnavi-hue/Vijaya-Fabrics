const express = require("express");
const { Order } = require("../models/Order");
const Cart = require("../models/Cart");
const Saree = require("../models/Saree");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

// A customer can only self-cancel while an order is still early in its
// lifecycle. Once it's shipped, out for delivery, delivered, or already
// cancelled, only the admin panel can touch its status.
const CUSTOMER_CANCELLABLE_STATUSES = ["Received", "Processing", "Packed"];

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

    // Reserve stock atomically, one item at a time. Each findOneAndUpdate only
    // succeeds if enough stock is still available at that instant — this is
    // what stops two customers from both buying the last piece in a race.
    // If any item fails, everything already decremented in this order is
    // rolled back so stock never goes missing on a rejected order.
    const decremented = [];
    for (const it of items) {
      const updated = await Saree.findOneAndUpdate(
        { _id: it.saree, stock: { $gte: it.qty } },
        { $inc: { stock: -it.qty } },
        { new: true }
      );
      if (!updated) {
        for (const d of decremented) {
          await Saree.findByIdAndUpdate(d.saree, { $inc: { stock: d.qty } });
        }
        const current = await Saree.findById(it.saree);
        const available = current ? current.stock : 0;
        return res.status(409).json({
          error: available > 0
            ? `Only ${available} piece${available === 1 ? "" : "s"} of "${it.name}" are currently available.`
            : `"${it.name}" just went out of stock.`,
          sareeId: it.saree,
          available
        });
      }
      decremented.push({ saree: it.saree, qty: it.qty });
    }

    let order;
    try {
      order = await Order.create({
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
    } catch (createErr) {
      // Order record failed to save — give back every piece of stock we reserved.
      for (const d of decremented) {
        await Saree.findByIdAndUpdate(d.saree, { $inc: { stock: d.qty } });
      }
      throw createErr;
    }

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

// POST /api/orders/:id/cancel — customer self-cancel, early lifecycle only.
// Restores every reserved piece back into inventory, same as an admin cancel.
router.post("/:id/cancel", requireCustomer, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ error: "Order not found." });

    if (!CUSTOMER_CANCELLABLE_STATUSES.includes(order.orderStatus)) {
      return res.status(400).json({
        error: order.orderStatus === "Cancelled"
          ? "This order is already cancelled."
          : "This order has already shipped and can no longer be cancelled online — please contact us for help."
      });
    }

    for (const item of order.items) {
      if (item.saree) {
        await Saree.findByIdAndUpdate(item.saree, { $inc: { stock: item.qty } });
      }
    }

    order.orderStatus = "Cancelled";
    order.statusHistory.push({ status: "Cancelled" });
    await order.save();

    res.json(order.toJSON());
  } catch (err) { next(err); }
});

module.exports = router;