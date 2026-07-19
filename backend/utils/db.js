const Saree = require("../models/Saree");
const { buildSeedData } = require("./seedSarees");

let seededCheck = false;

async function ensureSeeded() {
  if (seededCheck) return;
  seededCheck = true;
  const count = await Saree.countDocuments();
  if (count === 0) {
    await Saree.insertMany(buildSeedData());
  }
}

/* ---------- CRUD (all async — Mongo-backed) ---------- */

async function getAllSarees({ category, subtype } = {}) {
  await ensureSeeded();
  const query = {};
  if (category && category !== "all") query.category = category;
  if (subtype && subtype !== "all") query.subtype = subtype;
  const docs = await Saree.find(query).sort({ createdAt: 1 });
  return docs.map((d) => d.toJSON());
}

async function getSareeById(id) {
  await ensureSeeded();
  if (!id || !id.match || !id.match(/^[0-9a-fA-F]{24}$/)) return null;
  const doc = await Saree.findById(id);
  return doc ? doc.toJSON() : null;
}

async function addSaree(data) {
  const doc = await Saree.create(data);
  return doc.toJSON();
}

async function updateSaree(id, updates) {
  const doc = await Saree.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
  return doc ? doc.toJSON() : null;
}

async function deleteSaree(id) {
  const result = await Saree.findByIdAndDelete(id);
  return !!result;
}

async function resetToSeed() {
  await Saree.deleteMany({});
  const docs = await Saree.insertMany(buildSeedData());
  seededCheck = true;
  return docs.map((d) => d.toJSON());
}

module.exports = {
  getAllSarees,
  getSareeById,
  addSaree,
  updateSaree,
  deleteSaree,
  resetToSeed
};