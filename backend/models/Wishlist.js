const { mongoose } = require("../utils/mongo");

const wishlistSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    sarees: [{ type: mongoose.Schema.Types.ObjectId, ref: "Saree" }]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Wishlist || mongoose.model("Wishlist", wishlistSchema);