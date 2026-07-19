const { mongoose } = require("../utils/mongo");

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "Home" },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    isDefault: { type: Boolean, default: false }
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    phone: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    addresses: [addressSchema],
    // hash of the currently-valid refresh token; rotated on every /refresh call.
    // Wiping this (on logout) immediately invalidates any outstanding refresh token.
    refreshTokenHash: { type: String, default: null }
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    if (Array.isArray(ret.addresses)) {
      ret.addresses = ret.addresses.map((a) => {
        const addr = { ...a, id: a._id ? a._id.toString() : a.id };
        delete addr._id;
        return addr;
      });
    }
    return ret;
  }
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
