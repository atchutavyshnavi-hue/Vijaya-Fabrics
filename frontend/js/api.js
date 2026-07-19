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

  async login(password) {
    const res = await fetch(`${this.base}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
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

  async resetSeed() {
    const res = await fetch(`${this.base}/sarees/reset/seed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Reset failed.");
    return data;
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