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
