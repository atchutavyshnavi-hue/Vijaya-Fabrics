const { mongoose } = require("../utils/mongo");

const ORDER_STATUSES = [
  "Received",
  "Processing",
  "Packed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled"
];

const PAYMENT_STATUSES = ["Pending", "Paid", "Failed", "Refunded"];

const orderItemSchema = new mongoose.Schema(
  {
    saree: { type: mongoose.Schema.Types.ObjectId, ref: "Saree" },
    name: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 }
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    shippingAddress: { type: shippingAddressSchema, required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, default: "Cash on Delivery" },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "Pending" },
    orderStatus: { type: String, enum: ORDER_STATUSES, default: "Received" },
    statusHistory: { type: [statusHistorySchema], default: () => [{ status: "Received" }] }
  },
  { timestamps: true }
);

orderSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = {
  Order: mongoose.models.Order || mongoose.model("Order", orderSchema),
  ORDER_STATUSES,
  PAYMENT_STATUSES
};