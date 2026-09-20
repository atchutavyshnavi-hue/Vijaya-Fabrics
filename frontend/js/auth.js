/* Shared across index.html, catalog.html, cart.html, checkout.html, profile.html */

let __vfPendingAfterLogin = null;
let __vfResetEmail = null;

function openAuthModal(mode = "login") {
  const backdrop = document.getElementById("authModalBackdrop");
  if (!backdrop) return;
  setAuthTab(mode);
  backdrop.classList.add("open");
}

function closeAuthModal() {
  const backdrop = document.getElementById("authModalBackdrop");
  if (!backdrop) return;
  backdrop.classList.remove("open");
  document.getElementById("authError").classList.remove("show");
  __vfPendingAfterLogin = null;
}

function setAuthTab(mode) {
  document.querySelectorAll(".auth-tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
  document.querySelectorAll(".auth-panel").forEach((p) => p.style.display = p.dataset.mode === mode ? "block" : "none");
  document.getElementById("authError").classList.remove("show");
}

// Gate an action behind login: if already logged in, runs immediately;
// otherwise opens the auth modal and runs it once login/signup succeeds.
function requireLogin(action) {
  if (api.customer.isLoggedIn()) {
    action();
  } else {
    __vfPendingAfterLogin = action;
    openAuthModal("login");
  }
}

async function updateAccountNav() {
  const link = document.getElementById("navAccountLink");
  if (!link) return;
  if (api.customer.isLoggedIn()) {
    const user = api.customer.getUser();
    link.textContent = user?.name ? `Hi, ${user.name.split(" ")[0]}` : "My Account";
    link.href = "profile.html";
    link.onclick = null;
  } else {
    link.textContent = "Login";
    link.href = "#";
    link.onclick = (e) => { e.preventDefault(); openAuthModal("login"); };
  }
  await updateCartBadge();
  await updateWishlistBadge();
}

async function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  if (!api.customer.isLoggedIn()) { badge.style.display = "none"; return; }
  try {
    const cart = await api.cart.get();
    if (cart.itemCount > 0) {
      badge.textContent = cart.itemCount;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  } catch (err) {
    badge.style.display = "none";
  }
}

async function updateWishlistBadge() {
  const badge = document.getElementById("wishlistBadge");
  if (!badge) return;
  if (!api.customer.isLoggedIn()) { badge.style.display = "none"; return; }
  try {
    const wishlist = await api.wishlist.get();
    if (wishlist.count > 0) {
      badge.textContent = wishlist.count;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  } catch (err) {
    badge.style.display = "none";
  }
}

async function vfInitAuth() {
  await api.customer.silentRefresh();
  await updateAccountNav();

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => setAuthTab(tab.dataset.mode));
  });

  const backdrop = document.getElementById("authModalBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeAuthModal(); });
    document.querySelectorAll(".auth-close").forEach((b) => b.addEventListener("click", closeAuthModal));
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("authError");
      errorEl.classList.remove("show");
      const btn = loginForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await api.customer.login({
          email: document.getElementById("loginEmail").value.trim(),
          password: document.getElementById("loginPassword").value
        });
        await onAuthSuccess();
      } catch (err) {
        errorEl.textContent = err.message || "Login failed.";
        errorEl.classList.add("show");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const signupForm = document.getElementById("signupForm");
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("authError");
      errorEl.classList.remove("show");
      const btn = signupForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await api.customer.signup({
          name: document.getElementById("signupName").value.trim(),
          email: document.getElementById("signupEmail").value.trim(),
          phone: document.getElementById("signupPhone").value.trim(),
          password: document.getElementById("signupPassword").value
        });
        await onAuthSuccess();
      } catch (err) {
        errorEl.textContent = err.message || "Sign up failed.";
        errorEl.classList.add("show");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const forgotForm = document.getElementById("forgotForm");
  if (forgotForm) {
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("authError");
      errorEl.classList.remove("show");
      const btn = forgotForm.querySelector("button[type=submit]");
      btn.disabled = true;
      const email = document.getElementById("forgotEmail").value.trim();
      try {
        await api.customer.forgotPassword(email);
        __vfResetEmail = email;
        const label = document.getElementById("resetEmailLabel");
        if (label) label.textContent = email;
        vfToast("If that email is registered, a code has been sent.");
        setAuthTab("reset");
      } catch (err) {
        errorEl.textContent = err.message || "Could not send reset code.";
        errorEl.classList.add("show");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const resetForm = document.getElementById("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("authError");
      errorEl.classList.remove("show");
      const newPassword = document.getElementById("resetNewPassword").value;
      const confirmPassword = document.getElementById("resetConfirmPassword").value;
      if (newPassword !== confirmPassword) {
        errorEl.textContent = "Passwords do not match.";
        errorEl.classList.add("show");
        return;
      }
      const btn = resetForm.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        const otp = document.getElementById("resetOtp").value.trim();
        await api.customer.resetPassword({ email: __vfResetEmail, otp, newPassword });
        vfToast("Password reset successfully. Please log in.");
        resetForm.reset();
        setAuthTab("login");
      } catch (err) {
        errorEl.textContent = err.message || "Could not reset password.";
        errorEl.classList.add("show");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const logoutBtn = document.getElementById("navLogoutLink");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      await api.customer.logout();
      vfToast("Logged out");
      window.location.href = "index.html";
    });
  }
}

async function onAuthSuccess() {
  closeAuthModal();
  await updateAccountNav();
  vfToast(`Welcome, ${api.customer.getUser()?.name?.split(" ")[0] || ""}!`);
  const pending = __vfPendingAfterLogin;
  __vfPendingAfterLogin = null;
  if (pending) pending();
}

document.addEventListener("DOMContentLoaded", vfInitAuth);