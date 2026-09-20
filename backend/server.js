require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const { connectMongo } = require("./utils/mongo");
const Admin = require("./models/admin");

const authRoutes = require("./routes/auth");
const customerAuthRoutes = require("./routes/customerAuth");
const sareesRoutes = require("./routes/sarees");
const categoriesRoutes = require("./routes/categories");
const cartRoutes = require("./routes/cart");
const ordersRoutes = require("./routes/orders");
const adminOrdersRoutes = require("./routes/adminOrders");
const complaintsRoutes = require("./routes/complaints");
const adminComplaintsRoutes = require("./routes/adminComplaints");
const reviewsRoutes = require("./routes/reviews");
const crmRoutes = require("./routes/crm");

const app = express();
const PORT = process.env.PORT || 4000;

// credentials:true so the httpOnly refresh-token cookie survives fetch() calls
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Uploaded saree photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API
app.use("/api/auth", authRoutes); // admin login (unchanged)
app.use("/api/auth/customer", customerAuthRoutes); // customer signup/login/refresh/logout/profile
app.use("/api/sarees", sareesRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/admin/orders", adminOrdersRoutes); // admin-only OMS — separate path, own requireAdmin gate
app.use("/api/complaints", complaintsRoutes); // customer submit + view own complaints
app.use("/api/admin/complaints", adminComplaintsRoutes); // admin-only complaint management
app.use("/api/reviews", reviewsRoutes); // public read, purchase-verified write
app.use("/api/admin/crm", crmRoutes); // admin-only CRM analytics dashboard

// Frontend (static site) — express.static serves index.html automatically at "/"
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

// Central error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

// Creates the very first admin account from env vars if none exists yet.
// Safe to run on every startup — it's a no-op once an Admin document exists.
// This is what lets ADMIN_PASSWORD keep working exactly as before, just now
// backed by a real, hashed, database-stored account instead of a live
// plaintext comparison against process.env on every login.
async function ensureAdminSeeded() {
  const count = await Admin.countDocuments();
  if (count > 0) return;

  const email = (process.env.ADMIN_EMAIL || "admin@vijayafabrics.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    console.warn(
      "[Vijaya Fabrics] No admin account exists yet and ADMIN_PASSWORD is not set. " +
      "Set ADMIN_PASSWORD (and optionally ADMIN_EMAIL) in your environment and restart " +
      "the server to create the first admin account."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ email, passwordHash, name: "Admin" });
  console.log(`[Vijaya Fabrics] Created initial admin account: ${email}`);
}

connectMongo()
  .then(async () => {
    await ensureAdminSeeded();
    app.listen(PORT, () => {
      console.log(`Vijaya Fabrics server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });