const state = {
  category: "all",
  subtype: "all",
  categories: [],
  allSarees: [],
  search: "",
  sort: "default",
  priceMin: null,
  priceMax: null,
  colours: [],
  materials: [],
  inStockOnly: false
};

function initFromUrl() {
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  if (cat) state.category = cat;
  const q = params.get("q");
  if (q) state.search = q;
}

function renderCatFilters() {
  const wrap = document.getElementById("catFilters");
  const chips = [{ slug: "all", label: "All Sarees" }, ...state.categories];
  wrap.innerHTML = chips.map(c => `
    <button class="chip ${state.category === c.slug ? "active" : ""}" data-cat="${c.slug}">
      ${c.label}
    </button>`).join("");
  wrap.querySelectorAll(".chip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.category = btn.dataset.cat;
      state.subtype = "all";
      renderCatFilters();
      renderSubFilters();
      renderBreadcrumbs();
      renderGrid();
    });
  });
}

function renderSubFilters() {
  const wrap = document.getElementById("subFilters");
  if (state.category === "all") { wrap.innerHTML = ""; return; }
  const cat = getCategoryFrom(state.categories, state.category);
  if (!cat) { wrap.innerHTML = ""; return; }
  const chips = ["all", ...cat.subtypes];
  wrap.innerHTML = chips.map(s => `
    <button class="subchip ${state.subtype === s ? "active" : ""}" data-sub="${s}">
      ${s === "all" ? "All " + cat.label : s}
    </button>`).join("");
  wrap.querySelectorAll(".subchip").forEach(btn => {
    btn.addEventListener("click", () => {
      state.subtype = btn.dataset.sub;
      renderSubFilters();
      renderBreadcrumbs();
      renderGrid();
    });
  });
}

/* ---------- Breadcrumbs ---------- */
function renderBreadcrumbs() {
  const wrap = document.getElementById("breadcrumbs");
  if (!wrap) return;
  const parts = [`<a href="index.html">Home</a>`, `<span class="crumb-sep">/</span>`];
  if (state.category === "all") {
    parts.push(`<span class="crumb-current">Catalog</span>`);
  } else {
    const cat = getCategoryFrom(state.categories, state.category);
    const label = cat ? cat.label : state.category;
    if (state.subtype === "all") {
      parts.push(`<a href="catalog.html">Catalog</a>`, `<span class="crumb-sep">/</span>`, `<span class="crumb-current">${label}</span>`);
    } else {
      parts.push(
        `<a href="catalog.html">Catalog</a>`, `<span class="crumb-sep">/</span>`,
        `<a href="catalog.html?cat=${state.category}">${label}</a>`, `<span class="crumb-sep">/</span>`,
        `<span class="crumb-current">${state.subtype}</span>`
      );
    }
  }
  wrap.innerHTML = parts.join(" ");
}

/* ---------- Search, filters & sort ---------- */
function populateFilterOptions() {
  const colours = new Set();
  const materials = new Set();
  state.allSarees.forEach(p => {
    (p.colours || []).forEach(c => colours.add(c));
    if (p.fabric) materials.add(p.fabric);
  });

  const colourWrap = document.getElementById("colourFilters");
  colourWrap.innerHTML = [...colours].sort().map(c => `
    <button type="button" class="filter-chip ${state.colours.includes(c) ? "active" : ""}" data-colour="${c}">${c}</button>
  `).join("") || `<span style="font-size:.78rem; color:var(--charcoal-soft);">None listed</span>`;
  colourWrap.querySelectorAll("[data-colour]").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleInArray(state.colours, btn.dataset.colour);
      btn.classList.toggle("active");
      renderGrid();
    });
  });

  const materialWrap = document.getElementById("materialFilters");
  materialWrap.innerHTML = [...materials].sort().map(m => `
    <button type="button" class="filter-chip ${state.materials.includes(m) ? "active" : ""}" data-material="${m}">${m}</button>
  `).join("") || `<span style="font-size:.78rem; color:var(--charcoal-soft);">None listed</span>`;
  materialWrap.querySelectorAll("[data-material]").forEach(btn => {
    btn.addEventListener("click", () => {
      toggleInArray(state.materials, btn.dataset.material);
      btn.classList.toggle("active");
      renderGrid();
    });
  });
}

function toggleInArray(arr, value) {
  const i = arr.indexOf(value);
  if (i === -1) arr.push(value); else arr.splice(i, 1);
}

function matchesSearch(p, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const cat = getCategoryFrom(state.categories, p.category);
  const haystack = [
    p.name, p.category, cat ? cat.label : "", p.subtype, p.fabric,
    ...(p.colours || [])
  ].join(" ").toLowerCase();
  return haystack.includes(needle);
}

function applyFiltersAndSort(list) {
  let out = list.filter(p => {
    if (!matchesSearch(p, state.search)) return false;
    if (state.priceMin !== null && p.price < state.priceMin) return false;
    if (state.priceMax !== null && p.price > state.priceMax) return false;
    if (state.colours.length && !(p.colours || []).some(c => state.colours.includes(c))) return false;
    if (state.materials.length && !state.materials.includes(p.fabric)) return false;
    if (state.inStockOnly && p.inStock === false) return false;
    return true;
  });

  switch (state.sort) {
    case "price-asc": out = [...out].sort((a, b) => a.price - b.price); break;
    case "price-desc": out = [...out].sort((a, b) => b.price - a.price); break;
    case "newest": out = [...out].reverse(); break;
    case "popular": out = [...out].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
    default: break; // "Featured" — keep catalog order
  }
  return out;
}

function hasActiveFilters() {
  return !!state.search || state.priceMin !== null || state.priceMax !== null ||
    state.colours.length > 0 || state.materials.length > 0 || state.inStockOnly ||
    state.sort !== "default";
}

function clearAllFilters() {
  state.search = "";
  state.priceMin = null;
  state.priceMax = null;
  state.colours = [];
  state.materials = [];
  state.inStockOnly = false;
  state.sort = "default";
  document.getElementById("searchInput").value = "";
  document.getElementById("priceMin").value = "";
  document.getElementById("priceMax").value = "";
  document.getElementById("inStockOnly").checked = false;
  document.getElementById("sortSelect").value = "default";
  populateFilterOptions();
  renderGrid();
}

function renderGrid() {
  let list = state.allSarees;
  if (state.category !== "all") list = list.filter(p => p.category === state.category);
  if (state.subtype !== "all") list = list.filter(p => p.subtype === state.subtype);
  list = applyFiltersAndSort(list);

  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  if (!list.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    const emptyHeading = empty.querySelector("h3");
    const emptyBtn = document.getElementById("emptyClearFiltersBtn");
    if (hasActiveFilters()) {
      if (emptyHeading) emptyHeading.textContent = "No results match your search";
      if (emptyBtn) emptyBtn.style.display = "inline-flex";
    } else {
      if (emptyHeading) emptyHeading.textContent = "No sarees match this filter yet";
      if (emptyBtn) emptyBtn.style.display = "none";
    }
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = list.map(cardHtml).join("");
  grid.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });
  grid.querySelectorAll("[data-quick-add]").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      quickAddToCart(btn.dataset.quickAdd);
    });
  });
}

document.getElementById("searchInput").addEventListener("input", (e) => {
  state.search = e.target.value.trim();
  renderGrid();
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderGrid();
});

document.getElementById("toggleFiltersBtn").addEventListener("click", (e) => {
  const panel = document.getElementById("filterPanel");
  const open = panel.style.display !== "none";
  panel.style.display = open ? "none" : "flex";
  e.target.setAttribute("aria-expanded", String(!open));
});

document.getElementById("priceMin").addEventListener("change", (e) => {
  state.priceMin = e.target.value === "" ? null : Number(e.target.value);
  renderGrid();
});
document.getElementById("priceMax").addEventListener("change", (e) => {
  state.priceMax = e.target.value === "" ? null : Number(e.target.value);
  renderGrid();
});
document.getElementById("inStockOnly").addEventListener("change", (e) => {
  state.inStockOnly = e.target.checked;
  renderGrid();
});
document.getElementById("clearFiltersBtn").addEventListener("click", clearAllFilters);
document.getElementById("emptyClearFiltersBtn").addEventListener("click", clearAllFilters);

function cardHtml(p) {
  const outOfStock = p.inStock === false;
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="thumb" style="position:relative;">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        ${outOfStock
          ? `<span class="badge" style="position:absolute; bottom:10px; right:10px;">Out of stock</span>`
          : `<button class="btn btn-sm btn-gold" data-quick-add="${p.id}" style="position:absolute; bottom:10px; right:10px;">+ Cart</button>`}
      </div>
      <div class="info">
        <span class="sub">${p.subtype}</span>
        <h4>${p.name}</h4>
        <span class="price">${formatINR(p.price)}</span>
        ${p.lowStockCount ? `<span class="sub" style="color:var(--ink-maroon); display:block;">${p.lowStockCount} left in stock</span>` : ""}
      </div>
    </div>`;
}

async function quickAddToCart(sareeId) {
  requireLogin(async () => {
    try {
      await api.cart.add(sareeId, 1);
      await updateCartBadge();
      vfCartToast("Added to cart");
    } catch (err) {
      vfToast(err.message || "Could not add to cart.", true);
    }
  });
}

function openModal(id) {
  const p = state.allSarees.find(s => s.id === id);
  if (!p) return;
  const cat = getCategoryFrom(state.categories, p.category);
  const outOfStock = p.inStock === false;
  const coloursHtml = (p.colours || []).length
    ? `<div class="spec-row"><span>Available Colours</span><strong>${p.colours.join(", ")}</strong></div>`
    : "";
  const stockHtml = outOfStock
    ? `<div class="spec-row"><span>Availability</span><strong style="color:var(--ink-maroon);">Out of stock</strong></div>`
    : p.lowStockCount
      ? `<div class="spec-row"><span>Availability</span><strong style="color:var(--ink-maroon);">${p.lowStockCount} left in stock</strong></div>`
      : `<div class="spec-row"><span>Availability</span><strong>In stock</strong></div>`;

  document.getElementById("modalContent").innerHTML = `
    <img src="${p.image}" alt="${p.name}">
    <div class="modal-body">
      <button class="modal-close" aria-label="Close">×</button>
      <span class="sub">${cat ? cat.label : p.category} · ${p.subtype}</span>
      <h2 style="margin:.15em 0;">${p.name}</h2>
      <div class="price">${formatINR(p.price)}</div>
      <p>${p.description}</p>
      <div class="spec-row"><span>Fabric</span><strong>${p.fabric}</strong></div>
      <div class="spec-row"><span>Category</span><strong>${cat ? cat.label : p.category}</strong></div>
      <div class="spec-row"><span>Weave / Origin</span><strong>${p.subtype}</strong></div>
      ${coloursHtml}
      ${stockHtml}
      <div style="margin-top:1.6em; display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-gold" id="modalAddCart" ${outOfStock ? "disabled" : ""}>${outOfStock ? "Out of Stock" : "Add to Cart"}</button>
        <a class="btn btn-primary" target="_blank" rel="noopener"
           href="https://wa.me/919999999999?text=${encodeURIComponent("Hello, I'd like to know more about: " + p.name)}">
           Enquire on WhatsApp
        </a>
        <button class="btn btn-outline" id="modalCloseBtn">Close</button>
      </div>

      <div id="modalReviews" style="margin-top:2em; padding-top:1.4em; border-top:1px solid var(--line);">
        <p style="font-size:.85rem; color:var(--charcoal-soft);">Loading reviews…</p>
      </div>
    </div>`;
  document.getElementById("modalBackdrop").classList.add("open");
  document.querySelectorAll(".modal-close, #modalCloseBtn").forEach(b =>
    b.addEventListener("click", closeModal)
  );
  if (!outOfStock) {
    document.getElementById("modalAddCart").addEventListener("click", () => quickAddToCart(p.id));
  }
  history.replaceState(null, "", `catalog.html?product=${id}`);
  loadModalReviews(p.id);
}

/* ---------- Reviews (verified-purchaser only, enforced server-side) ---------- */
function reviewCardHtml(r) {
  const date = new Date(r.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" });
  const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
  return `
    <div style="padding:.7em 0; border-bottom:1px solid var(--line);">
      <div style="display:flex; justify-content:space-between; gap:10px;">
        <strong style="font-size:.88rem;">${r.customerName}</strong>
        <span style="color:var(--zari-gold-dark); letter-spacing:1px;">${stars}</span>
      </div>
      <div style="font-size:.76rem; color:var(--charcoal-soft); margin:.15em 0 .4em;">${date}</div>
      ${r.comment ? `<p style="font-size:.86rem; margin:0;">${r.comment}</p>` : ""}
    </div>`;
}

async function loadModalReviews(sareeId) {
  const wrap = document.getElementById("modalReviews");
  if (!wrap) return; // modal was closed before this resolved
  try {
    const { average, count, reviews } = await api.reviews.forSaree(sareeId);
    const summaryHtml = count
      ? `<div style="display:flex; align-items:center; gap:8px; margin-bottom:.8em;">
           <span style="color:var(--zari-gold-dark); font-size:1.1rem;">${"★".repeat(Math.round(average))}${"☆".repeat(5 - Math.round(average))}</span>
           <strong>${average}</strong> <span style="color:var(--charcoal-soft); font-size:.85rem;">(${count} review${count === 1 ? "" : "s"})</span>
         </div>`
      : `<p style="font-size:.85rem; color:var(--charcoal-soft); margin-bottom:.8em;">No reviews yet — be the first to review this after your order is delivered.</p>`;

    const listHtml = reviews.map(reviewCardHtml).join("");

    const canReview = api.customer.isLoggedIn();
    const formHtml = `
      <div style="margin-top:1.2em; padding-top:1em; border-top:1px solid var(--line);">
        <h4 style="margin:0 0 .6em;">Write a Review</h4>
        <p style="font-size:.78rem; color:var(--charcoal-soft); margin-bottom:.6em;">Only customers who've ordered this saree can review it.</p>
        <form id="reviewForm">
          <div class="form-field">
            <label for="reviewRating">Rating</label>
            <select id="reviewRating" required>
              <option value="">Select…</option>
              <option value="5">★★★★★ — Excellent</option>
              <option value="4">★★★★☆ — Good</option>
              <option value="3">★★★☆☆ — Okay</option>
              <option value="2">★★☆☆☆ — Not great</option>
              <option value="1">★☆☆☆☆ — Poor</option>
            </select>
          </div>
          <div class="form-field">
            <label for="reviewComment">Comment (optional)</label>
            <textarea id="reviewComment" rows="3" maxlength="1000"></textarea>
          </div>
          <button type="submit" class="btn btn-outline btn-sm">Submit Review</button>
        </form>
      </div>`;

    wrap.innerHTML = `<h3 style="margin:0 0 .6em;">Reviews</h3>${summaryHtml}<div>${listHtml}</div>${canReview ? formHtml : ""}`;

    if (canReview) {
      document.getElementById("reviewForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector("button[type=submit]");
        btn.disabled = true;
        try {
          await api.reviews.submit({
            sareeId,
            rating: Number(document.getElementById("reviewRating").value),
            comment: document.getElementById("reviewComment").value.trim()
          });
          vfToast("Thanks for your review!");
          loadModalReviews(sareeId);
        } catch (err) {
          vfToast(err.message || "Could not submit your review.", true);
        } finally {
          btn.disabled = false;
        }
      });
    }
  } catch (err) {
    wrap.innerHTML = `<p style="font-size:.85rem; color:var(--charcoal-soft);">Could not load reviews right now.</p>`;
  }
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.remove("open");
  history.replaceState(null, "", "catalog.html" + (state.category !== "all" ? `?cat=${state.category}` : ""));
}

document.getElementById("modalBackdrop").addEventListener("click", (e) => {
  if (e.target.id === "modalBackdrop") closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

async function init() {
  initFromUrl();
  try {
    const [cats, sarees] = await Promise.all([getCategoriesCached(), api.getSarees()]);
    state.categories = cats;
    state.allSarees = sarees;
    document.getElementById("loadingState").style.display = "none";

    if (state.search) document.getElementById("searchInput").value = state.search;

    renderCatFilters();
    renderSubFilters();
    renderBreadcrumbs();
    populateFilterOptions();
    renderGrid();

    const productParam = new URLSearchParams(location.search).get("product");
    if (productParam) openModal(productParam);
  } catch (err) {
    document.getElementById("loadingState").textContent = "Something went wrong loading the catalog. Please refresh.";
  }
}

init();