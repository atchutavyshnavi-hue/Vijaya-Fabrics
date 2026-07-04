/* Produces a fabric-swatch-style placeholder image as an SVG data URI.
   Used whenever a saree is added without a real uploaded photo. */

function escapeXml(str) {
  return String(str).replace(/[<>&'"]/g, (c) => ({
    "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;"
  }[c]));
}

function shade(hexColor, amt) {
  const c = hexColor.replace("#", "");
  const num = parseInt(c, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

function generateSwatch(name, hex, seed = 0) {
  const w = 480, h = 600;
  const light = shade(hex, 40);
  const dark = shade(hex, -40);
  const gold = "#C68A2E";
  let motifs = "";
  const cols = 6;
  for (let i = 0; i < cols; i++) {
    const x = (w / cols) * i + (w / cols) / 2;
    const rot = ((seed * 37 + i * 53) % 20) - 10;
    motifs += `<g transform="translate(${x},${h - 60}) rotate(${rot})">
      <path d="M0,-18 C10,-8 10,8 0,18 C-10,8 -10,-8 0,-18 Z" fill="${gold}" opacity="0.55"/>
    </g>`;
  }
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${light}"/>
        <stop offset="100%" stop-color="${dark}"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#g${seed})"/>
    <rect x="0" y="0" width="${w}" height="${h}" fill="none" stroke="${gold}" stroke-width="10"/>
    <rect x="18" y="18" width="${w - 36}" height="${h - 36}" fill="none" stroke="${gold}" stroke-width="2" opacity="0.7"/>
    <rect x="0" y="${h - 100}" width="${w}" height="100" fill="${dark}" opacity="0.55"/>
    ${motifs}
    <text x="${w / 2}" y="${h / 2 - 10}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="28" fill="#fff" opacity="0.92">${escapeXml(name)}</text>
    <text x="${w / 2}" y="${h / 2 + 22}" text-anchor="middle" font-family="Georgia, serif" font-size="15" letter-spacing="3" fill="${gold}">VIJAYA FABRICS</text>
  </svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg, "utf8").toString("base64");
}

module.exports = { generateSwatch };
