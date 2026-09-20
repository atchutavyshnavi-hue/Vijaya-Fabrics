const express = require("express");
const Review = require("../models/Review");
const { Order } = require("../models/Order");
const User = require("../models/User");
const { requireCustomer } = require("../middleware/auth");

const router = express.Router();

// GET /api/reviews/saree/:sareeId — public. Every visitor can read reviews.
router.get("/saree/:sareeId", async (req, res, next) => {
  try {
    const reviews = await Review.find({ saree: req.params.sareeId }).sort({ createdAt: -1 });
    const count = reviews.length;
    const average = count ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;
    res.json({
      average: Math.round(average * 10) / 10,
      count,
      reviews: reviews.map((r) => r.toJSON())
    });
  } catch (err) { next(err); }
});

// POST /api/reviews  { sareeId, rating, comment }
// Only a customer who actually bought this saree may review it — checked on
// the backend by searching their own orders, never trusted from the client.
router.post("/", requireCustomer, async (req, res, next) => {
  try {
    const { sareeId, rating, comment } = req.body || {};
    const numRating = Number(rating);
    if (!sareeId) return res.status(400).json({ error: "sareeId is required." });
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5." });
    }

    const purchaseOrder = await Order.findOne({
      user: req.userId,
      "items.saree": sareeId
    }).sort({ createdAt: -1 });

    if (!purchaseOrder) {
      return res.status(403).json({ error: "You can only review a saree you've ordered." });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "Account not found." });

    const review = await Review.findOneAndUpdate(
      { saree: sareeId, user: req.userId },
      {
        saree: sareeId,
        user: req.userId,
        order: purchaseOrder._id,
        customerName: user.name,
        rating: numRating,
        comment: (comment || "").trim()
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(review.toJSON());
  } catch (err) { next(err); }
});

// DELETE /api/reviews/:id — only the customer who wrote it
router.delete("/:id", requireCustomer, async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: "Review not found." });
    if (review.user.toString() !== req.userId) {
      return res.status(403).json({ error: "You can only remove your own review." });
    }
    await review.deleteOne();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;