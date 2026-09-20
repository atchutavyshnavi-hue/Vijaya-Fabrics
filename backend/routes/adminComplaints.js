const express = require("express");
const { Complaint, COMPLAINT_STATUSES } = require("../models/Complaint");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAdmin);

function shapeComplaint(c) {
  const obj = c.toJSON();
  if (c.user && typeof c.user === "object" && c.user.name) {
    obj.customer = { name: c.user.name, email: c.user.email, phone: c.user.phone };
  }
  if (c.order && typeof c.order === "object" && c.order.orderNumber) {
    obj.orderNumber = c.order.orderNumber;
  }
  delete obj.user;
  return obj;
}

// GET /api/admin/complaints?status=
router.get("/", async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status && status !== "all") {
      if (!COMPLAINT_STATUSES.includes(status)) return res.status(400).json({ error: "Invalid status filter." });
      query.status = status;
    }
    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 })
      .populate("user", "name email phone")
      .populate("order", "orderNumber");
    res.json(complaints.map(shapeComplaint));
  } catch (err) { next(err); }
});

// PUT /api/admin/complaints/:id/status  { status, adminNote? }
router.put("/:id/status", async (req, res, next) => {
  try {
    const { status, adminNote } = req.body || {};
    if (status && !COMPLAINT_STATUSES.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const updates = {};
    if (status) updates.status = status;
    if (adminNote !== undefined) updates.adminNote = adminNote.trim();

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate("user", "name email phone")
      .populate("order", "orderNumber");
    if (!complaint) return res.status(404).json({ error: "Complaint not found." });
    res.json(shapeComplaint(complaint));
  } catch (err) { next(err); }
});

module.exports = router;