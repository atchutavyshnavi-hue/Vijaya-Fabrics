const { mongoose } = require("../utils/mongo");

const sareeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    subtype: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    fabric: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

sareeSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.models.Saree || mongoose.model("Saree", sareeSchema);
