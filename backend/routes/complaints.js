const express = require("express");
const { Complaint } = require("../models/Complaint");
const { Order } = require("../models/Order");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

// POST /api/complaints  { subject, description, orderId? }
router.post("/", requireCustomer, async (req, res, next) => {
  try {
    const { subject, description, orderId } = req.body || {};
    if (!subject || !subject.trim()) return res.status(400).json({ error: "Subject is required." });
    if (!description || !description.trim()) return res.status(400).json({ error: "Description is required." });

    let order = null;
    if (orderId) {
      // Only allow linking an order that actually belongs to this customer —
      // never trust an orderId that points at someone else's order.
      order = await Order.findOne({ _id: orderId, user: req.userId });
      if (!order) return res.status(404).json({ error: "That order wasn't found on your account." });
    }

    const complaint = await Complaint.create({
      user: req.userId,
      order: order ? order._id : null,
      subject: subject.trim(),
      description: description.trim()
    });

    res.status(201).json(complaint.toJSON());
  } catch (err) { next(err); }
});

// GET /api/complaints — a customer's own complaints only
router.get("/", requireCustomer, async (req, res, next) => {
  try {
    const complaints = await Complaint.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(complaints.map((c) => c.toJSON()));
  } catch (err) { next(err); }
});

module.exports = router;