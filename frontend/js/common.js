document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector("nav.links");
  if (toggle && links) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.links a[data-page]").forEach((a) => {
    if (a.dataset.page === path) a.classList.add("active");
  });

  // Accessibility: a "skip to main content" link, added here (once) rather
  // than in every page's HTML, so a keyboard user can jump past the header
  // nav without hunting through it first.
  const skipLink = document.createElement("a");
  skipLink.href = "#mainContent";
  skipLink.className = "skip-link";
  skipLink.textContent = "Skip to main content";
  document.body.insertBefore(skipLink, document.body.firstChild);
  const header = document.querySelector("header.site");
  const mainTarget = header ? header.nextElementSibling : document.body.firstElementChild;
  if (mainTarget && !mainTarget.id) {
    mainTarget.id = "mainContent";
    mainTarget.setAttribute("tabindex", "-1");
  }

  // Trust strip: a quiet reassurance row right before the footer, on every
  // page — added here once rather than duplicated in every page's HTML.
  const footer = document.querySelector("footer.site");
  const isAdminPage = (location.pathname.split("/").pop() || "") === "admin.html";
  if (footer && !isAdminPage && !document.querySelector(".trust-strip")) {
    const strip = document.createElement("div");
    strip.className = "trust-strip";
    strip.innerHTML = `
      <span>🧵 Handloom sourced, Chirala</span>
      <span>💬 Order help on WhatsApp</span>
      <span>↩ Easy cancellation before shipping</span>
      <span>🔒 Your details stay private</span>`;
    footer.parentElement.insertBefore(strip, footer);
  }
});

// A skeleton placeholder grid shown while the catalog (or any product list)
// is loading, so the page has visible structure immediately instead of a
// blank area with just a "Loading…" line — reduces the feeling of a stall.
function vfSkeletonCards(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="skeleton-thumb"></div>
      <div class="skeleton-line" style="width:60%;"></div>
      <div class="skeleton-line" style="width:85%;"></div>
      <div class="skeleton-line" style="width:40%;"></div>
    </div>`).join("");
}

// A few skeleton rows for list-style pages (cart, wishlist, orders) where a
// full card grid doesn't fit the layout.
function vfSkeletonRows(count = 3) {
  return Array.from({ length: count }, () => `
    <div class="skeleton-row" aria-hidden="true">
      <div class="skeleton-thumb skeleton-thumb-sm"></div>
      <div style="flex:1;">
        <div class="skeleton-line" style="width:50%;"></div>
        <div class="skeleton-line" style="width:30%;"></div>
      </div>
    </div>`).join("");
}

// Debounces a function so it only runs after the given pause in calls —
// used on the catalog search box so every keystroke doesn't re-filter and
// re-render the whole grid.
function vfDebounce(fn, wait = 250) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function vfToast(msg, isError = false) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(window.__vfToastTimer);
  window.__vfToastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function formatINR(num) {
  return "₹" + Number(num).toLocaleString("en-IN");
}

// A richer toast for "added to cart" — gives the customer an immediate next
// step (view what they just added, or keep browsing) instead of leaving
// them to guess. Falls back silently if the page doesn't have room for it.
function vfCartToast(message) {
  let t = document.querySelector(".toast-cart");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast-cart";
    t.setAttribute("role", "status");
    t.setAttribute("aria-live", "polite");
    t.innerHTML = `
      <span class="tc-msg">✓ <span class="tc-msg-text"></span></span>
      <span class="tc-actions">
        <a href="cart.html">View Cart</a>
        <button type="button" class="tc-dismiss">Continue Shopping</button>
      </span>`;
    document.body.appendChild(t);
    t.querySelector(".tc-dismiss").addEventListener("click", () => t.classList.remove("show"));
  }
  t.querySelector(".tc-msg-text").textContent = message;
  t.classList.add("show");
  clearTimeout(window.__vfCartToastTimer);
  window.__vfCartToastTimer = setTimeout(() => t.classList.remove("show"), 4500);
}