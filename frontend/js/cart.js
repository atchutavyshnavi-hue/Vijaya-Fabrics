let cartData = null;

function lineHtml(line) {
  return `
    <div class="cart-line" data-id="${line.saree.id}">
      <img src="${line.saree.image}" alt="${line.saree.name}">
      <div>
        <div class="cl-name">${line.saree.name}</div>
        <div class="cl-sub">${line.saree.subtype}</div>
        <div class="cl-price">${formatINR(line.saree.price)} each</div>
      </div>
      <div class="qty-stepper" data-qty-for="${line.saree.id}">
        <button data-step="-1">−</button>
        <span>${line.qty}</span>
        <button data-step="1">+</button>
      </div>
      <div style="text-align:right;">
        <div class="cl-price">${formatINR(line.lineTotal)}</div>
        <button class="cl-remove" data-remove="${line.saree.id}">Remove</button>
      </div>
    </div>`;
}

function renderCart() {
  const loading = document.getElementById("loadingState");
  const empty = document.getElementById("emptyState");
  const layout = document.getElementById("cartLayout");
  loading.style.display = "none";

  if (!cartData || cartData.items.length === 0) {
    empty.style.display = "block";
    layout.style.display = "none";
    return;
  }
  empty.style.display = "none";
  layout.style.display = "grid";

  document.getElementById("cartLines").innerHTML = cartData.items.map(lineHtml).join("");
  document.getElementById("summaryCount").textContent = cartData.itemCount;
  document.getElementById("summaryTotal").textContent = formatINR(cartData.total);

  document.querySelectorAll("[data-step]").forEach((btn) => {
    btn.addEventListener("click", () => changeQty(btn.parentElement.dataset.qtyFor, Number(btn.dataset.step)));
  });
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeLine(btn.dataset.remove));
  });
}

async function changeQty(sareeId, delta) {
  const line = cartData.items.find((it) => it.saree.id === sareeId);
  if (!line) return;
  const newQty = line.qty + delta;
  try {
    if (newQty < 1) {
      cartData = await api.cart.remove(sareeId);
    } else {
      cartData = await api.cart.setQty(sareeId, newQty);
    }
    renderCart();
    await updateCartBadge();
  } catch (err) {
    vfToast(err.message || "Could not update your cart.", true);
  }
}

async function removeLine(sareeId) {
  try {
    cartData = await api.cart.remove(sareeId);
    renderCart();
    await updateCartBadge();
    vfToast("Removed from cart");
  } catch (err) {
    vfToast(err.message || "Could not remove this item.", true);
  }
}

async function initCartPage() {
  // vfInitAuth (in auth.js) runs on DOMContentLoaded too; give it a tick to finish the silent refresh.
  await api.customer.silentRefresh();
  await updateAccountNav();

  if (!api.customer.isLoggedIn()) {
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("emptyState").style.display = "block";
    document.getElementById("emptyState").innerHTML = `
      <h3>Log in to see your cart</h3>
      <p>Your cart is saved to your account so it's there whenever you come back.</p>
      <button class="btn btn-primary" id="cartLoginBtn" style="margin-top:1em;">Login / Sign Up</button>`;
    document.getElementById("cartLoginBtn").addEventListener("click", () => {
      requireLogin(() => initCartPage());
    });
    return;
  }

  try {
    document.getElementById("loadingState").style.display = "block";
    cartData = await api.cart.get();
    renderCart();
  } catch (err) {
    document.getElementById("loadingState").textContent = err.message || "Could not load your cart.";
  }
}

document.addEventListener("DOMContentLoaded", initCartPage);
