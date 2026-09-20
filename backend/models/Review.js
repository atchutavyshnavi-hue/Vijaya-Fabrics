const { mongoose } = require("../utils/mongo");

const reviewSchema = new mongoose.Schema(
  {
    saree: { type: mongoose.Schema.Types.ObjectId, ref: "Saree", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true }, // proof of purchase
    customerName: { type: String, required: true, trim: true }, // snapshot, so a deleted account doesn't orphan the review's byline
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

// One review per customer per saree — resubmitting updates it instead of
// stacking duplicates.
reviewSchema.index({ saree: 1, user: 1 }, { unique: true });

reviewSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.user) ret.user = ret.user.toString(); // opaque id only, so the owner can tell it's theirs — never name/email
    return ret;
  }
});

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);