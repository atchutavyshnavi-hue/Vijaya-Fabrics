const { mongoose } = require("../utils/mongo");

const balesSchema = new mongoose.Schema(
  {
    available: { type: Number, min: 0, default: 0 },
    piecesPerBale: { type: Number, min: 0, default: 0 },
    costPerBale: { type: Number, min: 0, default: 0 }
  },
  { _id: false }
);

const sareeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    subtype: { type: String, required: true },
    price: { type: Number, required: true, min: 0 }, // retail price
    bulkPrice: { type: Number, min: 0, default: null }, // per-piece price for bulk/reseller orders
    fabric: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    featured: { type: Boolean, default: false },
    colours: { type: [String], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0 }, // individual pieces in stock
    bales: { type: balesSchema, default: () => ({}) },
    active: { type: Boolean, default: true } // false = hidden from customer catalog
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