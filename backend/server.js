require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { connectMongo } = require("./utils/mongo");

const authRoutes = require("./routes/auth");
const customerAuthRoutes = require("./routes/customerAuth");
const sareesRoutes = require("./routes/sarees");
const categoriesRoutes = require("./routes/categories");
const cartRoutes = require("./routes/cart");
const ordersRoutes = require("./routes/orders");

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

// Frontend (static site) — express.static serves index.html automatically at "/"
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

// Central error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

connectMongo()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Vijaya Fabrics server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    process.exit(1);
  });