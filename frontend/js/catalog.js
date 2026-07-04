const state = {
  category: "all",
  subtype: "all",
  categories: [],
  allSarees: []
};

function initFromUrl() {
  const params = new URLSearchParams(location.search);
  const cat = params.get("cat");
  if (cat) state.category = cat;
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
      renderGrid();
    });
  });
}

function renderGrid() {
  let list = state.allSarees;
  if (state.category !== "all") list = list.filter(p => p.category === state.category);
  if (state.subtype !== "all") list = list.filter(p => p.subtype === state.subtype);

  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  if (!list.length) {
    grid.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = list.map(cardHtml).join("");
  grid.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => openModal(Number(card.dataset.id)));
  });
}

function cardHtml(p) {
  return `
    <div class="product-card" data-id="${p.id}">
      <div class="thumb"><img src="${p.image}" alt="${p.name}" loading="lazy"></div>
      <div class="info">
        <span class="sub">${p.subtype}</span>
        <h4>${p.name}</h4>
        <span class="price">${formatINR(p.price)}</span>
      </div>
    </div>`;
}

function openModal(id) {
  const p = state.allSarees.find(s => s.id === id);
  if (!p) return;
  const cat = getCategoryFrom(state.categories, p.category);
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
      <div style="margin-top:1.6em; display:flex; gap:10px; flex-wrap:wrap;">
        <a class="btn btn-primary" target="_blank" rel="noopener"
           href="https://wa.me/919999999999?text=${encodeURIComponent("Hello, I'd like to know more about: " + p.name)}">
           Enquire on WhatsApp
        </a>
        <button class="btn btn-outline" id="modalCloseBtn">Close</button>
      </div>
    </div>`;
  document.getElementById("modalBackdrop").classList.add("open");
  document.querySelectorAll(".modal-close, #modalCloseBtn").forEach(b =>
    b.addEventListener("click", closeModal)
  );
  history.replaceState(null, "", `catalog.html?product=${id}`);
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

    renderCatFilters();
    renderSubFilters();
    renderGrid();

    const productParam = new URLSearchParams(location.search).get("product");
    if (productParam) openModal(Number(productParam));
  } catch (err) {
    document.getElementById("loadingState").textContent = err.message || "Could not load the catalog. Please refresh.";
  }
}

init();
