const express = require("express");
const { Order, ORDER_STATUSES, PAYMENT_STATUSES } = require("../models/Order");
const Saree = require("../models/Saree");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Every route below is admin-only.
router.use(requireAdmin);

const TERMINAL_STATUSES = ["Delivered", "Cancelled"];

function shapeOrder(order) {
  const obj = order.toJSON();
  // order.user is populated with { name, email, phone } for the admin view only —
  // customers never see another customer's contact info, and the customer-facing
  // /api/orders routes never populate or expose this field.
  if (order.user && typeof order.user === "object" && order.user.name) {
    obj.customer = {
      id: order.user._id ? order.user._id.toString() : order.user.id,
      name: order.user.name,
      email: order.user.email,
      phone: order.user.phone
    };
  }
  delete obj.user;
  return obj;
}

// GET /api/admin/orders?status=&search=  — every order, newest first
router.get("/", async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const query = {};
    if (status && status !== "all") {
      if (!ORDER_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid order status filter." });
      query.orderStatus = status;
    }
    if (search && search.trim()) {
      query.orderNumber = { $regex: search.trim(), $options: "i" };
    }
    const orders = await Order.find(query).sort({ createdAt: -1 }).populate("user", "name email phone");
    res.json(orders.map(shapeOrder));
  } catch (err) { next(err); }
});

// GET /api/admin/orders/:id — full detail for one order
router.get("/:id", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email phone");
    if (!order) return res.status(404).json({ error: "Order not found." });
    res.json(shapeOrder(order));
  } catch (err) { next(err); }
});

// PUT /api/admin/orders/:id/status  { status?, paymentStatus? }
router.put("/:id/status", async (req, res, next) => {
  try {
    const { status, paymentStatus } = req.body || {};
    if (!status && !paymentStatus) {
      return res.status(400).json({ error: "Provide a status or paymentStatus to update." });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });

    if (status) {
      if (!ORDER_STATUSES.includes(status)) {
        return res.status(400).json({ error: "Invalid order status." });
      }
      if (TERMINAL_STATUSES.includes(order.orderStatus)) {
        return res.status(400).json({
          error: `This order is already ${order.orderStatus.toLowerCase()} and its status can no longer be changed.`
        });
      }
      if (status === "Cancelled") {
        // Release every reserved piece back into inventory. This is what
        // makes the stock available again for other pending customers.
        for (const item of order.items) {
          if (item.saree) {
            await Saree.findByIdAndUpdate(item.saree, { $inc: { stock: item.qty } });
          }
        }
      }
      order.orderStatus = status;
      order.statusHistory.push({ status });
    }

    if (paymentStatus) {
      if (!PAYMENT_STATUSES.includes(paymentStatus)) {
        return res.status(400).json({ error: "Invalid payment status." });
      }
      order.paymentStatus = paymentStatus;
    }

    await order.save();
    const populated = await order.populate("user", "name email phone");
    res.json(shapeOrder(populated));
  } catch (err) { next(err); }
});

module.exports = router;