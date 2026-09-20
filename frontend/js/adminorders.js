/* Admin Order Management (OMS) — separate tab inside admin.html. */
/*===*/
const ORDER_STATUS_LIST = ["Received", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"];
const PAYMENT_STATUS_LIST = ["Pending", "Paid", "Failed", "Refunded"];
const TERMINAL_STATUSES = ["Delivered", "Cancelled"];

let ordersState = { status: "all", search: "" };

/* ---------- Tab switching (Catalog <-> Orders) ---------- */
function setAdminTab(tab) {
  document.getElementById("tabCatalogBtn").classList.toggle("active", tab === "catalog");
  document.getElementById("tabOrdersBtn").classList.toggle("active", tab === "orders");
  document.getElementById("catalogSection").style.display = tab === "catalog" ? "" : "none";
  document.getElementById("ordersSection").style.display = tab === "orders" ? "" : "none";

  if (tab === "orders") {
    document.getElementById("adminEyebrow").textContent = "Order Management";
    document.getElementById("adminHeading").textContent = "Manage orders";
    document.getElementById("adminSubtext").textContent = "Update order status — customers see the change on their tracking page immediately.";
    renderOrderFilters();
    loadOrders();
  } else {
    document.getElementById("adminEyebrow").textContent = "Catalog Management";
    document.getElementById("adminHeading").textContent = "Manage sarees";
    document.getElementById("adminSubtext").textContent = "Changes here save to the server and appear for every visitor immediately.";
  }
}

document.getElementById("tabCatalogBtn")?.addEventListener("click", () => setAdminTab("catalog"));
document.getElementById("tabOrdersBtn")?.addEventListener("click", () => setAdminTab("orders"));

function renderOrderFilters() {
  const wrap = document.getElementById("orderStatusFilters");
  const chips = ["all", ...ORDER_STATUS_LIST];
  wrap.innerHTML = chips.map(s => `
    <button class="chip ${ordersState.status === s ? "active" : ""}" data-status-filter="${s}">
      ${s === "all" ? "All" : s}
    </button>`).join("");
  wrap.querySelectorAll("[data-status-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      ordersState.status = btn.dataset.statusFilter;
      renderOrderFilters();
      loadOrders();
    });
  });
}

document.getElementById("orderRefreshBtn")?.addEventListener("click", loadOrders);
document.getElementById("orderSearch")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    ordersState.search = e.target.value.trim();
    loadOrders();
  }
});

function paymentBadgeColor(status) {
  if (status === "Paid") return "background:#E3F3E5; color:#1F6B34;";
  if (status === "Failed") return "background:#FBE4E4; color:var(--ink-maroon-dark);";
  if (status === "Refunded") return "background:#E2EEFB; color:#1F4B7A;";
  return "background:#FDF0DD; color:#8A5B14;"; // Pending
}

function orderRowHtml(o) {
  const date = new Date(o.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const itemsSummary = o.items.map(it => `${it.name} × ${it.qty}`).join(", ");
  const isTerminal = TERMINAL_STATUSES.includes(o.orderStatus);
  const customerLine = o.customer
    ? `${o.customer.name}<br><span style="color:var(--charcoal-soft); font-size:.78rem;">${o.customer.phone || ""}</span>`
    : "—";

  return `
    <tr>
      <td><strong>${o.orderNumber}</strong><br><span style="font-size:.76rem; color:var(--charcoal-soft);">${o.shippingAddress.city}, ${o.shippingAddress.pincode}</span></td>
      <td>${customerLine}</td>
      <td style="max-width:220px; font-size:.8rem;">${itemsSummary}</td>
      <td>${formatINR(o.totalAmount)}</td>
      <td>
        <select data-payment-select="${o.id}" style="font-size:.78rem; padding:4px 6px; border-radius:6px; border:1px solid var(--line); ${paymentBadgeColor(o.paymentStatus)}">
          ${PAYMENT_STATUS_LIST.map(p => `<option value="${p}" ${p === o.paymentStatus ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </td>
      <td><span class="status-pill ${o.orderStatus.toLowerCase().replace(/\s+/g, "-")}">${o.orderStatus}</span></td>
      <td style="font-size:.78rem;">${date}</td>
      <td>
        <select data-status-select="${o.id}" ${isTerminal ? "disabled" : ""} style="font-size:.78rem; padding:4px 6px; border-radius:6px; border:1px solid var(--line);">
          ${ORDER_STATUS_LIST.map(s => `<option value="${s}" ${s === o.orderStatus ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
    </tr>`;
}

async function loadOrders() {
  const body = document.getElementById("orderTableBody");
  const empty = document.getElementById("ordersEmptyState");
  try {
    const orders = await api.adminOrders.list(ordersState);
    document.getElementById("orderCountLabel").textContent = orders.length;
    if (!orders.length) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    body.innerHTML = orders.map(orderRowHtml).join("");

    body.querySelectorAll("[data-status-select]").forEach(sel => {
      const original = sel.value;
      sel.addEventListener("change", async () => {
        const id = sel.dataset.statusSelect;
        const newStatus = sel.value;
        if (newStatus === "Cancelled" && !confirm("Cancel this order and return its items to stock?")) {
          sel.value = original;
          return;
        }
        sel.disabled = true;
        try {
          await api.adminOrders.updateStatus(id, { status: newStatus });
          vfToast(`Order marked as ${newStatus}`);
          await loadOrders();
        } catch (err) {
          vfToast(err.message || "Could not update order status.", true);
          sel.value = original;
          sel.disabled = false;
        }
      });
    });

    body.querySelectorAll("[data-payment-select]").forEach(sel => {
      const original = sel.value;
      sel.addEventListener("change", async () => {
        const id = sel.dataset.paymentSelect;
        sel.disabled = true;
        try {
          await api.adminOrders.updateStatus(id, { paymentStatus: sel.value });
          vfToast("Payment status updated");
        } catch (err) {
          vfToast(err.message || "Could not update payment status.", true);
          sel.value = original;
        } finally {
          sel.disabled = false;
        }
      });
    });
  } catch (err) {
    vfToast(err.message || "Could not load orders.", true);
  }
}