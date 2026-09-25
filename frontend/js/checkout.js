let checkoutCart = null;
let selectedAddressId = null;
let currentStep = 1;

function addressCardHtml(addr, selected) {
  return `
    <div class="address-card" style="cursor:pointer; ${selected ? "border-color:var(--ink-maroon);" : ""}" data-select-address="${addr.id}">
      <label style="display:flex; gap:10px; align-items:flex-start; cursor:pointer;">
        <input type="radio" name="shipAddr" value="${addr.id}" ${selected ? "checked" : ""} style="margin-top:4px;">
        <span>
          <strong>${addr.label || "Address"}</strong>${addr.isDefault ? ' <span class="badge">Default</span>' : ""}<br>
          <span style="font-size:.86rem; color:var(--charcoal-soft);">
            ${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}<br>
            ${addr.city}, ${addr.state} — ${addr.pincode}
          </span>
        </span>
      </label>
    </div>`;
}

function renderAddresses() {
  const user = api.customer.getUser();
  const addresses = user?.addresses || [];
  const wrap = document.getElementById("addressList");

  if (!addresses.length) {
    wrap.innerHTML = `<p style="color:var(--charcoal-soft); font-size:.88rem;">You don't have a saved address yet — add one below.</p>`;
    selectedAddressId = null;
    return;
  }

  if (!selectedAddressId || !addresses.some((a) => a.id === selectedAddressId)) {
    selectedAddressId = (addresses.find((a) => a.isDefault) || addresses[0]).id;
  }

  wrap.innerHTML = addresses.map((a) => addressCardHtml(a, a.id === selectedAddressId)).join("");
  wrap.querySelectorAll("[data-select-address]").forEach((card) => {
    card.addEventListener("click", () => {
      selectedAddressId = card.dataset.selectAddress;
      renderAddresses();
    });
  });
}

// The order summary sidebar shows the full price breakdown and stays
// visible through every step, so the customer always knows what they'll
// pay before they reach the payment step.
function renderSummary() {
  document.getElementById("summaryLines").innerHTML = checkoutCart.items.map((it) => `
    <div class="summary-row"><span>${it.saree.name} × ${it.qty}</span><span>${formatINR(it.lineTotal)}</span></div>
  `).join("");
  document.getElementById("summarySubtotal").textContent = formatINR(checkoutCart.total);
  document.getElementById("summaryTotal").textContent = formatINR(checkoutCart.total);
}

function renderReview() {
  document.getElementById("reviewLines").innerHTML = checkoutCart.items.map((it) => `
    <div class="summary-row"><span>${it.saree.name} × ${it.qty}</span><span>${formatINR(it.lineTotal)}</span></div>
  `).join("");
  const user = api.customer.getUser();
  const addr = (user?.addresses || []).find((a) => a.id === selectedAddressId);
  const name = document.getElementById("recName").value.trim();
  document.getElementById("reviewAddressText").textContent = addr
    ? `${name}, ${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}, ${addr.city}, ${addr.state} — ${addr.pincode}`
    : "";
}

/* ---------- Step navigation ---------- */
function goToStep(step) {
  currentStep = step;
  document.querySelectorAll(".checkout-step-panel").forEach((panel) => {
    panel.style.display = Number(panel.dataset.stepPanel) === step ? "block" : "none";
  });
  document.querySelectorAll("#checkoutSteps li").forEach((li) => {
    const liStep = Number(li.dataset.step);
    li.classList.toggle("active", liStep === step);
    li.classList.toggle("done", liStep < step);
  });
  document.getElementById("checkoutLayout").scrollIntoView({ behavior: "smooth", block: "start" });
}

document.getElementById("step1NextBtn").addEventListener("click", () => {
  const errorEl = document.getElementById("step1Error");
  errorEl.style.display = "none";

  const name = document.getElementById("recName").value.trim();
  const phone = document.getElementById("recPhone").value.trim();
  const user = api.customer.getUser();
  const addr = (user?.addresses || []).find((a) => a.id === selectedAddressId);

  if (!addr) {
    errorEl.textContent = "Please select or add a delivery address.";
    errorEl.style.display = "block";
    return;
  }
  if (!name || !phone || phone.length < 10) {
    errorEl.textContent = "Please enter a valid recipient name and phone number.";
    errorEl.style.display = "block";
    return;
  }

  renderReview();
  goToStep(2);
});

document.getElementById("step2BackBtn").addEventListener("click", () => goToStep(1));
document.getElementById("step2NextBtn").addEventListener("click", () => goToStep(3));
document.getElementById("step3BackBtn").addEventListener("click", () => goToStep(2));

document.getElementById("showAddAddressBtn").addEventListener("click", () => {
  document.getElementById("addAddressToggle").style.display = "none";
  document.getElementById("addAddressForm").style.display = "block";
});
document.getElementById("cancelAddAddress").addEventListener("click", () => {
  document.getElementById("addAddressForm").style.display = "none";
  document.getElementById("addAddressToggle").style.display = "block";
  document.getElementById("addAddressForm").reset();
});

document.getElementById("addAddressForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    const user = await api.customer.addAddress({
      label: document.getElementById("caLabel").value.trim() || "Home",
      line1: document.getElementById("caLine1").value.trim(),
      line2: document.getElementById("caLine2").value.trim(),
      city: document.getElementById("caCity").value.trim(),
      state: document.getElementById("caState").value.trim(),
      pincode: document.getElementById("caPincode").value.trim()
    });
    selectedAddressId = (user.addresses.find((a) => a.isDefault) || user.addresses[user.addresses.length - 1]).id;
    renderAddresses();
    document.getElementById("addAddressForm").style.display = "none";
    document.getElementById("addAddressToggle").style.display = "block";
    document.getElementById("addAddressForm").reset();
    vfToast("Address saved");
  } catch (err) {
    vfToast(err.message || "Could not save this address.", true);
  } finally {
    btn.disabled = false;
  }
});

document.getElementById("placeOrderBtn").addEventListener("click", async () => {
  const errorEl = document.getElementById("checkoutError");
  errorEl.classList.remove("show");
  errorEl.style.display = "none";

  const name = document.getElementById("recName").value.trim();
  const phone = document.getElementById("recPhone").value.trim();
  const user = api.customer.getUser();
  const addr = (user?.addresses || []).find((a) => a.id === selectedAddressId);

  if (!addr || !name || !phone || phone.length < 10) {
    // Shouldn't normally happen (step 1 already validated this), but guards
    // against the customer navigating back and clearing something.
    errorEl.textContent = "Please go back and complete your delivery details.";
    errorEl.style.display = "block";
    goToStep(1);
    return;
  }

  const btn = document.getElementById("placeOrderBtn");
  btn.disabled = true;
  btn.textContent = "Placing order…";
  try {
    const order = await api.orders.place({
      shippingAddress: {
        name, phone,
        line1: addr.line1, line2: addr.line2, city: addr.city, state: addr.state, pincode: addr.pincode
      },
      paymentMethod: document.getElementById("paymentMethod").value
    });
    document.getElementById("checkoutLayout").style.display = "none";
    document.getElementById("successState").style.display = "block";
    document.getElementById("successText").textContent =
      `Order ${order.orderNumber} for ${formatINR(order.totalAmount)} has been received. We'll call ${phone} to confirm before dispatch.`;
    await updateCartBadge();
  } catch (err) {
    errorEl.textContent = err.message || "Could not place your order.";
    errorEl.style.display = "block";
  } finally {
    btn.disabled = false;
    btn.textContent = "Place Order";
  }
});

async function initCheckoutPage() {
  await api.customer.silentRefresh();
  await updateAccountNav();

  if (!api.customer.isLoggedIn()) {
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("emptyState").style.display = "block";
    document.getElementById("emptyTitle").textContent = "Log in to check out";
    document.getElementById("emptyText").textContent = "Your cart is saved to your account — log in to continue.";
    document.getElementById("emptyCta").textContent = "Login / Sign Up";
    document.getElementById("emptyCta").setAttribute("href", "#");
    document.getElementById("emptyCta").onclick = (e) => {
      e.preventDefault();
      requireLogin(() => initCheckoutPage());
    };
    return;
  }

  const loading = document.getElementById("loadingState");
  loading.style.display = "block";
  loading.innerHTML = vfSkeletonRows(2);
  try {
    checkoutCart = await api.cart.get();
  } catch (err) {
    loading.innerHTML = `
      <p>${err.message || "Could not load your cart."}</p>
      <button class="btn btn-outline btn-sm" id="checkoutRetryBtn" type="button">Try Again</button>`;
    document.getElementById("checkoutRetryBtn").addEventListener("click", initCheckoutPage);
    return;
  }

  loading.style.display = "none";

  if (!checkoutCart.items.length) {
    document.getElementById("emptyState").style.display = "block";
    return;
  }

  document.getElementById("checkoutLayout").style.display = "grid";
  const user = api.customer.getUser();
  document.getElementById("recName").value = user?.name || "";
  document.getElementById("recPhone").value = user?.phone || "";
  renderAddresses();
  renderSummary();
  goToStep(1);
}

document.addEventListener("DOMContentLoaded", initCheckoutPage);