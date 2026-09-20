document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector("nav.links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
    links.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => links.classList.remove("open"))
    );
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav.links a[data-page]").forEach((a) => {
    if (a.dataset.page === path) a.classList.add("active");
  });
});

function vfToast(msg, isError = false) {
  let t = document.querySelector(".toast");
  if (!t) {
    t = document.createElement("div");
    t.className = "toast";
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