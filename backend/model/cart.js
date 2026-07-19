const { mongoose } = require("../utils/mongo");

const cartItemSchema = new mongoose.Schema(
  {
    saree: { type: mongoose.Schema.Types.ObjectId, ref: "Saree", required: true },
    qty: { type: Number, required: true, min: 1, default: 1 }
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    items: [cartItemSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.models.Cart || mongoose.model("Cart", cartSchema);