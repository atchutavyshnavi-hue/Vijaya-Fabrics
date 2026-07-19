const { getCategory } = require("./categories");
const { generateSwatch } = require("./swatch");

/* ---------- Seed catalog (20 sample sarees across all categories) ---------- */
function buildSeedData() {
  const items = [];
  let seed = 0;

  const push = (category, subtype, name, price, fabric, desc) => {
    const cat = getCategory(category);
    items.push({
      name,
      category,
      subtype,
      price,
      fabric,
      description: desc,
      image: generateSwatch(name, cat.color, seed++),
      featured: items.length % 4 === 3
    });
  };

  push("silk", "Surat Silk", "Surat Silk Saree — Maroon Zari", 3499, "Pure Surat Silk",
    "A rich maroon Surat silk saree with a fine gold zari border, light enough for all-day wear at weddings and pujas.");
  push("silk", "Surat Silk", "Surat Silk Saree — Emerald Weave", 3299, "Pure Surat Silk",
    "Emerald green Surat silk with a self-woven pallu, pairs well with temple jewellery.");

  push("cotton", "Meena Cotton", "Meena Cotton Saree — Indigo Check", 1299, "Meena Cotton",
    "Breathable Meena cotton in an indigo check, ideal for daily wear and office.");
  push("cotton", "Mahuva Cotton", "Mahuva Cotton Saree — Mustard Stripe", 1199, "Mahuva Cotton",
    "Light Mahuva cotton with a mustard stripe body and contrast border, easy to drape and iron.");
  push("cotton", "Nehatha Cotton", "Nehatha Cotton Saree — Rust Floral", 1349, "Nehatha Cotton",
    "Soft Nehatha cotton with a small rust floral print, comfortable for Chirala's summer heat.");
  push("cotton", "Vasundhara Cotton", "Vasundhara Cotton Saree — Teal Ikat", 1399, "Vasundhara Cotton",
    "Vasundhara cotton with an ikat-inspired teal pattern and thin gold border.");

  push("fancy", "Banaras Fancy", "Banaras Fancy Saree — Wine Silk Blend", 2799, "Silk Blend",
    "Fancy Banaras-style weave in wine with a broad brocade border, suited for festive occasions.");
  push("fancy", "Bengaluru Fancy", "Bengaluru Fancy Saree — Peach Georgette", 1999, "Georgette",
    "Lightweight Bengaluru fancy georgette in peach with delicate sequin work.");
  push("fancy", "Kolkata Fancy", "Kolkata Fancy Saree — Ivory Tant", 1699, "Tant Cotton Blend",
    "Kolkata-style tant weave in ivory with a black temple border, crisp and elegant.");

  push("punjabi", "Cotton Material", "Punjabi Dress Material — Cotton, Sky Blue", 999, "Cotton",
    "Unstitched Punjabi dress set in sky blue cotton with matching dupatta.");
  push("punjabi", "Fancy Material", "Punjabi Dress Material — Fancy, Blush Pink", 1449, "Fancy Fabric",
    "Fancy fabric Punjabi set with embroidered yoke, blush pink with silver thread work.");
  push("punjabi", "Pattu Material", "Punjabi Dress Material — Pattu, Deep Purple", 1899, "Pattu Silk",
    "Pattu silk Punjabi dress material in deep purple, festive and rich in texture.");

  push("handloom", "Chirala Handloom", "Chirala Handloom Saree — Classic Checks", 2199, "Handloom Cotton",
    "Woven right here in Chirala — classic checks with a contrast handloom border.");
  push("handloom", "Mangalagiri Handloom", "Mangalagiri Handloom Saree — Nizam Border", 2399, "Handloom Cotton",
    "Mangalagiri handloom with the traditional gold Nizam border, soft and durable.");
  push("handloom", "Pochampalli Handloom", "Pochampalli Handloom Saree — Ikat Diamond", 2899, "Handloom Ikat Silk-Cotton",
    "Pochampalli ikat with a diamond pattern, hand-dyed before weaving for a signature blurred edge.");

  push("pattu", "Banaras Pattu", "Banaras Pattu Saree — Royal Blue", 5499, "Pattu Silk",
    "Heavy Banaras pattu in royal blue with dense zari work, a bridal favourite.");
  push("pattu", "Mangalagiri Pattu", "Mangalagiri Pattu Saree — Maroon Gold", 4299, "Pattu Silk",
    "Mangalagiri pattu with the iconic Nizam gold border on a deep maroon body.");
  push("pattu", "Dharmavaram Pattu", "Dharmavaram Pattu Saree — Temple Border", 6299, "Pattu Silk",
    "Dharmavaram pattu with a wide temple-motif border, richly woven for weddings.");
  push("pattu", "Light Weight Pattu", "Light Weight Pattu Saree — Coral", 3799, "Light Pattu Silk",
    "A lighter pattu weave in coral for guests who want the silk look without the heavy weight.");
  push("pattu", "Sico Pattu", "Sico Pattu Saree — Olive Green", 2999, "Silk-Cotton (Sico)",
    "Sico pattu blends silk sheen with cotton comfort, olive green with a thin gold line border.");

  return items;
}

module.exports = { buildSeedData };