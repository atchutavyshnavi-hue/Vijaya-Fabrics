const VF_TOKEN_KEY = "vf_admin_token";

const api = {
  base: "/api",

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
