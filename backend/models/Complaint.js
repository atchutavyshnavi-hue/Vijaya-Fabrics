const { mongoose } = require("../utils/mongo");

const COMPLAINT_STATUSES = ["Open", "In Review", "Resolved", "Closed"];

const complaintSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    subject: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: "Open" },
    adminNote: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

complaintSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = {
  Complaint: mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema),
  COMPLAINT_STATUSES
};