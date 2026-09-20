const express = require("express");
const { Order, ORDER_STATUSES } = require("../models/Order");
const { Complaint, COMPLAINT_STATUSES } = require("../models/Complaint");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(requireAdmin);

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// GET /api/admin/crm/summary — every number here comes straight from MongoDB
// aggregation, never hard-coded or estimated.
router.get("/summary", async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();

    const statusAgg = await Order.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } }
    ]);
    const ordersByStatus = {};
    ORDER_STATUSES.forEach((s) => { ordersByStatus[s] = 0; });
    statusAgg.forEach((row) => { ordersByStatus[row._id] = row.count; });

    const delivered = ordersByStatus["Delivered"] || 0;
    const cancelled = ordersByStatus["Cancelled"] || 0;
    const pending = Math.max(0, totalOrders - delivered - cancelled);

    const revenueAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = revenueAgg[0] ? revenueAgg[0].total : 0;

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    const monthly = monthlyAgg.map((row) => ({
      label: `${MONTH_NAMES[row._id.month - 1]} ${row._id.year}`,
      count: row.count,
      revenue: row.revenue
    }));

    const categoryAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $lookup: {
          from: "sarees",
          localField: "items.saree",
          foreignField: "_id",
          as: "sareeDoc"
        }
      },
      { $unwind: { path: "$sareeDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ["$sareeDoc.category", "unknown"] },
          unitsSold: { $sum: "$items.qty" },
          revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } }
        }
      },
      { $sort: { revenue: -1 } }
    ]);
    const categoryPerformance = categoryAgg.map((row) => ({
      category: row._id,
      unitsSold: row.unitsSold,
      revenue: row.revenue
    }));

    const totalComplaints = await Complaint.countDocuments();
    const complaintAgg = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const complaintsByStatus = {};
    COMPLAINT_STATUSES.forEach((s) => { complaintsByStatus[s] = 0; });
    complaintAgg.forEach((row) => { complaintsByStatus[row._id] = row.count; });

    res.json({
      totalOrders,
      ordersByStatus,
      delivered,
      cancelled,
      pending,
      totalRevenue,
      monthly,
      categoryPerformance,
      totalComplaints,
      complaintsByStatus
    });
  } catch (err) { next(err); }
});

module.exports = router;