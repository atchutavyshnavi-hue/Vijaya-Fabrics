const VF_TOKEN_KEY = "vf_admin_token";

const api = {
  base: "/api",

  /* ---------- Admin (unchanged) ---------- */
  getToken() {
    return sessionStorage.getItem(VF_TOKEN_KEY);
  },
  setToken(token) {
    sessionStorage.setItem(VF_TOKEN_KEY, token);
  },
  clearToken() {
    sessionStorage.removeItem(VF_TOKEN_KEY);
  },
  isLoggedIn() {
    return !!this.getToken();
  },

  async getCategories() {
    const res = await fetch(`${this.base}/categories`);
    if (!res.ok) throw new Error("Could not load categories.");
    return res.json();
  },

  // Always anonymous — the customer-facing catalog/product pages must NEVER
  // see admin-shaped (unmasked stock) data, even if an admin happens to be
  // logged in on this same browser tab. Use adminGetSarees() below for the
  // admin panel instead of adding a token here.
  async getSarees({ category, subtype } = {}) {
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    if (subtype && subtype !== "all") params.set("subtype", subtype);
    const qs = params.toString();
    const res = await fetch(`${this.base}/sarees${qs ? "?" + qs : ""}`);
    if (!res.ok) throw new Error("Could not load the catalog.");
    return res.json();
  },

  async getSaree(id) {
    const res = await fetch(`${this.base}/sarees/${id}`);
    if (!res.ok) throw new Error("Saree not found.");
    return res.json();
  },

  // Admin-only variant that deliberately attaches the admin token, so the
  // admin panel's table sees real stock numbers. Never used by
  // customer-facing pages.
  async adminGetSarees({ category, subtype } = {}) {
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    if (subtype && subtype !== "all") params.set("subtype", subtype);
    const qs = params.toString();
    const res = await fetch(`${this.base}/sarees${qs ? "?" + qs : ""}`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
    if (!res.ok) throw new Error("Could not load the catalog.");
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${this.base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed.");
    this.setToken(data.token);
    return data;
  },

  async authedFormRequest(url, method, formData) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${this.getToken()}` },
      body: formData
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
  },

  async addSaree(formData) {
    return this.authedFormRequest(`${this.base}/sarees`, "POST", formData);
  },

  async updateSaree(id, formData) {
    return this.authedFormRequest(`${this.base}/sarees/${id}`, "PUT", formData);
  },

  async deleteSaree(id) {
    const res = await fetch(`${this.base}/sarees/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Delete failed.");
    return data;
  },

  async changeAdminPassword({ currentPassword, newPassword }) {
    const res = await fetch(`${this.base}/auth/change-password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.getToken()}` },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Could not change password.");
    return data;
  },

  async resetSeed() {
    const res = await fetch(`${this.base}/sarees/reset/seed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Reset failed.");
    return data;
  },

  /* ---------- Admin: Order Management (OMS) ---------- */
  adminOrders: {
    async list({ status, search } = {}) {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      if (search) params.set("search", search);
      const qs = params.toString();
      const res = await fetch(`${api.base}/admin/orders${qs ? "?" + qs : ""}`, {
        headers: { Authorization: `Bearer ${api.getToken()}` }
      });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(data.error || "Could not load orders.");
      return data;
    },
    async updateStatus(id, { status, paymentStatus } = {}) {
      const res = await fetch(`${api.base}/admin/orders/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.getToken()}` },
        body: JSON.stringify({ status, paymentStatus })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update this order.");
      return data;
    }
  },

  /* ---------- Admin: Complaints ---------- */
  adminComplaints: {
    async list({ status } = {}) {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      const qs = params.toString();
      const res = await fetch(`${api.base}/admin/complaints${qs ? "?" + qs : ""}`, {
        headers: { Authorization: `Bearer ${api.getToken()}` }
      });
      const data = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(data.error || "Could not load complaints.");
      return data;
    },
    async updateStatus(id, { status, adminNote } = {}) {
      const res = await fetch(`${api.base}/admin/complaints/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${api.getToken()}` },
        body: JSON.stringify({ status, adminNote })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not update this complaint.");
      return data;
    }
  },

  /* ---------- Admin: CRM dashboard ---------- */
  crm: {
    async summary() {
      const res = await fetch(`${api.base}/admin/crm/summary`, {
        headers: { Authorization: `Bearer ${api.getToken()}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load the CRM dashboard.");
      return data;
    }
  },

  /* =====================================================================
     Customer account. Access token lives in memory only (never
     localStorage) — silentRefresh() uses the httpOnly refresh cookie to
     restore it on every page load, which is what keeps a customer
     "logged in until they log out" without exposing a long-lived token to JS.
  ===================================================================== */
  customer: {
    _accessToken: null,
    _user: null,

    isLoggedIn() { return !!this._user; },
    getUser() { return this._user; },

    async _fetch(url, options = {}) {
      const res = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          ...(this._accessToken ? { Authorization: `Bearer ${this._accessToken}` } : {})
        }
      });
      return res;
    },

    // Wraps a fetch call: on 401 (expired access token) silently refreshes
    // once via the cookie and retries the original request.
    async request(url, options = {}) {
      let res = await this._fetch(url, options);
      if (res.status === 401 && this._accessToken) {
        const ok = await this.silentRefresh();
        if (ok) res = await this._fetch(url, options);
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed.");
      return data;
    },

    // Restores the session from the refresh cookie if one is present.
    // Resolves quietly (not an error) if the visitor is a guest.
    async silentRefresh() {
      try {
        const res = await fetch(`${api.base}/auth/customer/refresh`, {
          method: "POST",
          credentials: "include"
        });
        if (!res.ok) {
          this._accessToken = null;
          this._user = null;
          return false;
        }
        const data = await res.json();
        this._accessToken = data.accessToken;
        this._user = data.user;
        return true;
      } catch (err) {
        return false;
      }
    },

    async signup({ name, email, phone, password }) {
      const data = await this.request(`${api.base}/auth/customer/signup`, {
        method: "POST",
        body: JSON.stringify({ name, email, phone, password })
      });
      this._accessToken = data.accessToken;
      this._user = data.user;
      return data.user;
    },

    async login({ email, password }) {
      const data = await this.request(`${api.base}/auth/customer/login`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      this._accessToken = data.accessToken;
      this._user = data.user;
      return data.user;
    },

    async logout() {
      try {
        await fetch(`${api.base}/auth/customer/logout`, { method: "POST", credentials: "include" });
      } catch (err) { /* ignore network errors on logout */ }
      this._accessToken = null;
      this._user = null;
    },

    // These two run before the customer is logged in, so they don't go
    // through this.request() (no access token to attach yet).
    async forgotPassword(email) {
      const res = await fetch(`${api.base}/auth/customer/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send reset code.");
      return data;
    },

    async resetPassword({ email, otp, newPassword }) {
      const res = await fetch(`${api.base}/auth/customer/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not reset password.");
      return data;
    },

    async updateProfile({ name, phone }) {
      const user = await this.request(`${api.base}/auth/customer/me`, {
        method: "PUT",
        body: JSON.stringify({ name, phone })
      });
      this._user = user;
      return user;
    },

    async changePassword({ currentPassword, newPassword }) {
      return this.request(`${api.base}/auth/customer/me/password`, {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword })
      });
    },

    async addAddress(address) {
      const user = await this.request(`${api.base}/auth/customer/me/addresses`, {
        method: "POST",
        body: JSON.stringify(address)
      });
      this._user = user;
      return user;
    },

    async updateAddress(addressId, address) {
      const user = await this.request(`${api.base}/auth/customer/me/addresses/${addressId}`, {
        method: "PUT",
        body: JSON.stringify(address)
      });
      this._user = user;
      return user;
    },

    async deleteAddress(addressId) {
      const user = await this.request(`${api.base}/auth/customer/me/addresses/${addressId}`, {
        method: "DELETE"
      });
      this._user = user;
      return user;
    }
  },

  /* ---------- Cart ---------- */
  cart: {
    async get() {
      return api.customer.request(`${api.base}/cart`);
    },
    async add(sareeId, qty = 1) {
      return api.customer.request(`${api.base}/cart`, {
        method: "POST",
        body: JSON.stringify({ sareeId, qty })
      });
    },
    async setQty(sareeId, qty) {
      return api.customer.request(`${api.base}/cart/${sareeId}`, {
        method: "PUT",
        body: JSON.stringify({ qty })
      });
    },
    async remove(sareeId) {
      return api.customer.request(`${api.base}/cart/${sareeId}`, { method: "DELETE" });
    },
    async clear() {
      return api.customer.request(`${api.base}/cart`, { method: "DELETE" });
    }
  },

  /* ---------- Wishlist ---------- */
  wishlist: {
    async get() {
      return api.customer.request(`${api.base}/wishlist`);
    },
    async add(sareeId) {
      return api.customer.request(`${api.base}/wishlist`, {
        method: "POST",
        body: JSON.stringify({ sareeId })
      });
    },
    async remove(sareeId) {
      return api.customer.request(`${api.base}/wishlist/${sareeId}`, { method: "DELETE" });
    },
    async moveToCart(sareeId, qty = 1) {
      return api.customer.request(`${api.base}/wishlist/${sareeId}/move-to-cart`, {
        method: "POST",
        body: JSON.stringify({ qty })
      });
    }
  },

  /* ---------- Orders ---------- */
  orders: {
    async place({ shippingAddress, paymentMethod }) {
      return api.customer.request(`${api.base}/orders`, {
        method: "POST",
        body: JSON.stringify({ shippingAddress, paymentMethod })
      });
    },
    async list() {
      return api.customer.request(`${api.base}/orders`);
    },
    async get(id) {
      return api.customer.request(`${api.base}/orders/${id}`);
    },
    async cancel(id) {
      return api.customer.request(`${api.base}/orders/${id}/cancel`, { method: "POST" });
    }
  },

  /* ---------- Complaints (customer) ---------- */
  complaints: {
    async submit({ subject, description, orderId } = {}) {
      return api.customer.request(`${api.base}/complaints`, {
        method: "POST",
        body: JSON.stringify({ subject, description, orderId })
      });
    },
    async list() {
      return api.customer.request(`${api.base}/complaints`);
    }
  },

  /* ---------- Reviews ---------- */
  reviews: {
    // Public — no login required to read.
    async forSaree(sareeId) {
      const res = await fetch(`${api.base}/reviews/saree/${sareeId}`);
      const data = await res.json().catch(() => ({ average: 0, count: 0, reviews: [] }));
      if (!res.ok) throw new Error(data.error || "Could not load reviews.");
      return data;
    },
    // Login-gated; backend also verifies the customer actually bought it.
    async submit({ sareeId, rating, comment } = {}) {
      return api.customer.request(`${api.base}/reviews`, {
        method: "POST",
        body: JSON.stringify({ sareeId, rating, comment })
      });
    },
    async remove(id) {
      return api.customer.request(`${api.base}/reviews/${id}`, { method: "DELETE" });
    }
  }
};

let CATEGORIES_CACHE = null;
async function getCategoriesCached() {
  if (!CATEGORIES_CACHE) CATEGORIES_CACHE = await api.getCategories();
  return CATEGORIES_CACHE;
}
function getCategoryFrom(list, slug) {
  return list.find((c) => c.slug === slug);
}