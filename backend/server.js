require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const sareesRoutes = require("./routes/sarees");
const categoriesRoutes = require("./routes/categories");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Uploaded saree photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API
app.use("/api/auth", authRoutes);
app.use("/api/sarees", sareesRoutes);
app.use("/api/categories", categoriesRoutes);

// Frontend (static site) — express.static serves index.html automatically at "/"
const frontendDir = path.join(__dirname, "..", "frontend");
app.use(express.static(frontendDir));

// Central error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Vijaya Fabrics server running at http://localhost:${PORT}`);
});
