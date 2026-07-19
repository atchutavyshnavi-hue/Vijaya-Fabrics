let editingAddressId = null;

/* ---------- Tabs ---------- */
function switchProfileTab(tab) {
  document.querySelectorAll("#tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.dataset.tabPanel === tab));
  history.replaceState(null, "", `profile.html?tab=${tab}`);
}
document.getElementById("tabbar").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-tab]");
  if (btn) switchProfileTab(btn.dataset.tab);
});

/* ---------- Personal Info ---------- */
function renderInfo() {
  const user = api.customer.getUser();
  document.getElementById("whoLine").innerHTML = `<span class="who">${user.name}</span> · ${user.email}`;
  document.getElementById("infoName").value = user.name;
  document.getElementById("infoEmail").value = user.email;
  document.getElementById("infoPhone").value = user.phone;
}

document.getElementById("infoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await api.customer.updateProfile({
      name: document.getElementById("infoName").value.trim(),
      phone: document.getElementById("infoPhone").value.trim()
    });
    renderInfo();
    await updateAccountNav();
    vfToast("Profile updated");
  } catch (err) {
    vfToast(err.message || "Could not update your profile.", true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("passwordError");
  errorEl.style.display = "none";
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await api.customer.changePassword({
      currentPassword: document.getElementById("curPassword").value,
      newPassword: document.getElementById("newPassword").value
    });
    vfToast("Password updated — please log in again.");
    document.getElementById("passwordForm").reset();
    window.location.href = "index.html";
  } catch (err) {
    errorEl.textContent = err.message || "Could not update your password.";
    errorEl.style.display = "block";
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("logoutBtnProfile").addEventListener("click", async () => {
  await api.customer.logout();
  vfToast("Logged out");
  window.location.href = "index.html";
});

/* ---------- Addresses ---------- */
function renderAddressesTab() {
  const user = api.customer.getUser();
  const addresses = user.addresses || [];
  const wrap = document.getElementById("addressListProfile");

  if (!addresses.length) {
    wrap.innerHTML = `<p style="color:var(--charcoal-soft); font-size:.88rem;">No saved addresses yet.</p>`;
  } else {
    wrap.innerHTML = addresses.map((a) => `
      <div class="address-card">
        ${a.isDefault ? '<span class="badge badge-default">Default</span>' : ""}
        <strong>${a.label || "Address"}</strong><br>
        <span style="font-size:.86rem; color:var(--charcoal-soft);">
          ${a.line1}${a.line2 ? ", " + a.line2 : ""}<br>
          ${a.city}, ${a.state} — ${a.pincode}
        </span>
        <div class="addr-actions">
          <button data-edit-addr="${a.id}">Edit</button>
          <button data-del-addr="${a.id}">Delete</button>
          ${!a.isDefault ? `<button data-default-addr="${a.id}">Set as Default</button>` : ""}
        </div>
      </div>`).join("");

    wrap.querySelectorAll("[data-edit-addr]").forEach((btn) =>
      btn.addEventListener("click", () => startEditAddress(btn.dataset.editAddr)));
    wrap.querySelectorAll("[data-del-addr]").forEach((btn) =>
      btn.addEventListener("click", () => deleteAddress(btn.dataset.delAddr)));
    wrap.querySelectorAll("[data-default-addr]").forEach((btn) =>
      btn.addEventListener("click", () => setDefaultAddress(btn.dataset.defaultAddr)));
  }
}

function startEditAddress(addressId) {
  const user = api.customer.getUser();
  const addr = user.addresses.find((a) => a.id === addressId);
  if (!addr) return;
  editingAddressId = addressId;
  document.getElementById("paLabel").value = addr.label || "";
  document.getElementById("paLine1").value = addr.line1;
  document.getElementById("paLine2").value = addr.line2 || "";
  document.getElementById("paCity").value = addr.city;
  document.getElementById("paState").value = addr.state;
  document.getElementById("paPincode").value = addr.pincode;
  document.getElementById("addAddressFormProfile").style.display = "block";
  document.getElementById("showAddAddressBtnProfile").style.display = "none";
  document.getElementById("addAddressFormProfile").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function deleteAddress(addressId) {
  if (!confirm("Delete this address?")) return;
  try {
    await api.customer.deleteAddress(addressId);
    renderAddressesTab();
    vfToast("Address deleted");
  } catch (err) {
    vfToast(err.message || "Could not delete this address.", true);
  }
}

async function setDefaultAddress(addressId) {
  try {
    await api.customer.updateAddress(addressId, { isDefault: true });
    renderAddressesTab();
    vfToast("Default address updated");
  } catch (err) {
    vfToast(err.message || "Could not update default address.", true);
  }
}

document.getElementById("showAddAddressBtnProfile").addEventListener("click", () => {
  editingAddressId = null;
  document.getElementById("addAddressFormProfile").reset();
  document.getElementById("paState").value = "Andhra Pradesh";
  document.getElementById("addAddressFormProfile").style.display = "block";
  document.getElementById("showAddAddressBtnProfile").style.display = "none";
});
document.getElementById("cancelAddAddressProfile").addEventListener("click", () => {
  editingAddressId = null;
  document.getElementById("addAddressFormProfile").style.display = "none";
  document.getElementById("showAddAddressBtnProfile").style.display = "inline-flex";
  document.getElementById("addAddressFormProfile").reset();
});

document.getElementById("addAddressFormProfile").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  const payload = {
    label: document.getElementById("paLabel").value.trim() || "Home",
    line1: document.getElementById("paLine1").value.trim(),
    line2: document.getElementById("paLine2").value.trim(),
    city: document.getElementById("paCity").value.trim(),
    state: document.getElementById("paState").value.trim(),
    pincode: document.getElementById("paPincode").value.trim()
  };
  try {
    if (editingAddressId) {
      await api.customer.updateAddress(editingAddressId, payload);
      vfToast("Address updated");
    } else {
      await api.customer.addAddress(payload);
      vfToast("Address saved");
    }
    editingAddressId = null;
    document.getElementById("addAddressFormProfile").style.display = "none";
    document.getElementById("showAddAddressBtnProfile").style.display = "inline-flex";
    document.getElementById("addAddressFormProfile").reset();
    renderAddressesTab();
  } catch (err) {
    vfToast(err.message || "Could not save this address.", true);
  } finally {
    btn.disabled = false;
  }
});

/* ---------- Order History & Tracking ---------- */
function statusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function orderCardHtml(order) {
  const date = new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const stepsHtml = order.orderStatus === "Cancelled"
    ? `<p style="color:var(--ink-maroon-dark); font-weight:600; margin-top:1em;">This order was cancelled.</p>`
    : `<div class="tracker">
        ${ORDER_STEPS.map((step, i) => {
          const idx = ORDER_STEPS.indexOf(order.orderStatus);
          return `<div class="tracker-step ${i <= idx ? "done" : ""}"><span class="dot"></span><span>${step}</span></div>`;
        }).join("")}
      </div>`;

  return `
    <div class="order-card">
      <div class="order-card-head">
        <div>
          <div class="onum">${order.orderNumber}</div>
          <div class="odate">${date}</div>
        </div>
        <span class="status-pill ${statusClass(order.orderStatus)}">${order.orderStatus}</span>
      </div>
      ${stepsHtml}
      <div class="order-items-mini">
        ${order.items.map((it) => `
          <div class="oi-row"><span>${it.name} × ${it.qty}</span><span>${formatINR(it.price * it.qty)}</span></div>
        `).join("")}
        <div class="oi-row" style="font-weight:700; border-bottom:none;"><span>Total</span><span>${formatINR(order.totalAmount)}</span></div>
      </div>
      <p style="font-size:.8rem; color:var(--charcoal-soft); margin-top:1em; margin-bottom:0;">
        Shipping to ${order.shippingAddress.name}, ${order.shippingAddress.line1}, ${order.shippingAddress.city} — ${order.shippingAddress.pincode} · Payment: ${order.paymentMethod} (${order.paymentStatus})
      </p>
    </div>`;
}

const ORDER_STEPS = ["Received", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered"];

async function renderOrders() {
  const listEl = document.getElementById("ordersList");
  const emptyEl = document.getElementById("noOrdersState");
  try {
    const orders = await api.orders.list();
    if (!orders.length) {
      listEl.innerHTML = "";
      emptyEl.style.display = "block";
      return;
    }
    emptyEl.style.display = "none";
    listEl.innerHTML = orders.map(orderCardHtml).join("");
  } catch (err) {
    vfToast(err.message || "Could not load your orders.", true);
  }
}

/* ---------- Boot ---------- */
async function initProfilePage() {
  await api.customer.silentRefresh();
  await updateAccountNav();
  document.getElementById("loadingState").style.display = "none";

  if (!api.customer.isLoggedIn()) {
    document.getElementById("loggedOutState").style.display = "block";
    document.getElementById("profileLoginBtn").addEventListener("click", () => {
      requireLogin(() => initProfilePage());
    });
    return;
  }

  document.getElementById("profileContent").style.display = "block";
  renderInfo();
  renderAddressesTab();
  await renderOrders();

  const tab = new URLSearchParams(location.search).get("tab");
  if (tab && ["info", "addresses", "orders"].includes(tab)) switchProfileTab(tab);
}

document.addEventListener("DOMContentLoaded", initProfilePage);