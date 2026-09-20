let wishlistItems = [];

function wishlistCardHtml(p) {
  const outOfStock = p.inStock === false;
  return `
    <div class="product-card" data-id="${p.id}" style="cursor:default;">
      <div class="thumb" style="position:relative;">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <button class="btn btn-sm" data-remove-wish="${p.id}" title="Remove from wishlist"
          style="position:absolute; top:8px; right:8px; background:var(--white); border-radius:50%; width:32px; height:32px; padding:0; display:flex; align-items:center; justify-content:center; font-size:1rem;">✕</button>
        ${outOfStock ? `<span class="badge" style="position:absolute; bottom:10px; right:10px;">Out of stock</span>` : ""}
      </div>
      <div class="info">
        <span class="sub">${p.subtype}</span>
        <h4><a href="catalog.html?product=${p.id}" style="color:inherit; text-decoration:none;">${p.name}</a></h4>
        <span class="price">${formatINR(p.price)}</span>
        ${p.lowStockCount ? `<span class="sub" style="color:var(--ink-maroon); display:block;">${p.lowStockCount} left in stock</span>` : ""}
        <button class="btn btn-gold btn-sm" data-move-cart="${p.id}" style="width:100%; justify-content:center; margin-top:.8em;" ${outOfStock ? "disabled" : ""}>
          ${outOfStock ? "Out of Stock" : "Move to Cart"}
        </button>
      </div>
    </div>`;
}

function renderWishlist() {
  const grid = document.getElementById("wishlistGrid");
  const empty = document.getElementById("emptyState");
  document.getElementById("loadingState").style.display = "none";

  if (!wishlistItems.length) {
    grid.style.display = "none";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  grid.style.display = "grid";
  grid.innerHTML = wishlistItems.map(wishlistCardHtml).join("");

  grid.querySelectorAll("[data-remove-wish]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromWishlist(btn.dataset.removeWish));
  });
  grid.querySelectorAll("[data-move-cart]").forEach((btn) => {
    btn.addEventListener("click", () => moveToCart(btn.dataset.moveCart));
  });
}

async function removeFromWishlist(sareeId) {
  if (!confirm("Remove this item from your wishlist?")) return;
  try {
    const data = await api.wishlist.remove(sareeId);
    wishlistItems = data.items;
    renderWishlist();
    await updateWishlistBadge();
    vfToast("Removed from wishlist");
  } catch (err) {
    vfToast(err.message || "Could not remove this item.", true);
  }
}

async function moveToCart(sareeId) {
  try {
    const data = await api.wishlist.moveToCart(sareeId, 1);
    wishlistItems = data.items;
    renderWishlist();
    await updateWishlistBadge();
    await updateCartBadge();
    vfCartToast("Moved to cart");
  } catch (err) {
    vfToast(err.message || "Could not move this item to your cart.", true);
  }
}

async function initWishlistPage() {
  await api.customer.silentRefresh();
  await updateAccountNav();

  if (!api.customer.isLoggedIn()) {
    document.getElementById("loadingState").style.display = "none";
    document.getElementById("emptyState").style.display = "block";
    document.getElementById("emptyState").innerHTML = `
      <h3>Log in to see your wishlist</h3>
      <p>Your wishlist is saved to your account so it's there whenever you come back.</p>
      <button class="btn btn-primary" id="wishlistLoginBtn" style="margin-top:1em;">Login / Sign Up</button>`;
    document.getElementById("wishlistLoginBtn").addEventListener("click", () => {
      requireLogin(() => initWishlistPage());
    });
    return;
  }

  const loading = document.getElementById("loadingState");
  loading.className = "loading-state product-grid";
  loading.innerHTML = vfSkeletonCards(4);
  try {
    const data = await api.wishlist.get();
    wishlistItems = data.items;
    renderWishlist();
  } catch (err) {
    loading.className = "loading-state";
    loading.style.display = "block";
    loading.innerHTML = `
      <p>${err.message || "Something went wrong loading your wishlist."}</p>
      <button class="btn btn-outline btn-sm" id="wishlistRetryBtn" type="button">Try Again</button>`;
    document.getElementById("wishlistRetryBtn").addEventListener("click", initWishlistPage);
  }
}

document.addEventListener("DOMContentLoaded", initWishlistPage);