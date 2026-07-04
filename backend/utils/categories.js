/* Category & subtype definitions for the saree catalog. */

const CATEGORIES = [
  {
    slug: "silk",
    label: "Silk Sarees",
    tagline: "Surat silk, smooth and light on the shoulder",
    color: "#8A1621",
    subtypes: ["Surat Silk"]
  },
  {
    slug: "cotton",
    label: "Cotton Sarees",
    tagline: "Everyday weaves for warm Andhra afternoons",
    color: "#1F4B4A",
    subtypes: ["Meena Cotton", "Mahuva Cotton", "Nehatha Cotton", "Vasundhara Cotton"]
  },
  {
    slug: "fancy",
    label: "Fancy Sarees",
    tagline: "Banaras, Bengaluru & Kolkata, for special occasions",
    color: "#6B3FA0",
    subtypes: ["Banaras Fancy", "Bengaluru Fancy", "Kolkata Fancy"]
  },
  {
    slug: "punjabi",
    label: "Punjabi Dress Materials",
    tagline: "Unstitched sets in cotton, fancy and pattu fabric",
    color: "#B15A2E",
    subtypes: ["Cotton Material", "Fancy Material", "Pattu Material"]
  },
  {
    slug: "handloom",
    label: "Handloom Sarees",
    tagline: "Chirala, Mangalagiri & Pochampalli, woven by hand",
    color: "#0F6E5B",
    subtypes: ["Chirala Handloom", "Mangalagiri Handloom", "Pochampalli Handloom"]
  },
  {
    slug: "pattu",
    label: "Pattu Sarees",
    tagline: "Banaras, Mangalagiri & Dharmavaram silk pattu",
    color: "#9A1B4E",
    subtypes: ["Banaras Pattu", "Mangalagiri Pattu", "Dharmavaram Pattu", "Light Weight Pattu", "Sico Pattu"]
  }
];

function getCategory(slug) {
  return CATEGORIES.find((c) => c.slug === slug);
}

function isValidCategory(slug) {
  return CATEGORIES.some((c) => c.slug === slug);
}

function isValidSubtype(categorySlug, subtype) {
  const cat = getCategory(categorySlug);
  return !!cat && cat.subtypes.includes(subtype);
}

module.exports = { CATEGORIES, getCategory, isValidCategory, isValidSubtype };
