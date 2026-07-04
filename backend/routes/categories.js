const express = require("express");
const { CATEGORIES } = require("../utils/categories");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(CATEGORIES);
});

module.exports = router;
