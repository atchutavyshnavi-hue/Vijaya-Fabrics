const loginShell = document.getElementById("loginShell");
const adminPanel = document.getElementById("adminPanel");

let categories = [];
let pendingImageFile = null;

function showPanel() {
  loginShell.style.display = "none";
  adminPanel.style.display = "block";
  initAdminPanel();
}
function showLogin() {
  loginShell.style.display = "flex";
  adminPanel.style.display = "none";
}

document.getElementById("loginBtn").addEventListener("click", attemptLogin);
document.getElementById("adminPass").addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptLogin();
});

async function attemptLogin() {
  const val = document.getElementById("adminPass").value;
  const errorEl = document.getElementById("loginError");
  errorEl.style.display = "none";
  try {
    await api.login(val);
    showPanel();
  } catch (err) {
    errorEl.textContent = err.message || "Login failed.";
    errorEl.style.display = "block";
  }
}

document.getElementById("logoutBtn")?.addEventListener("click", () => {
  api.clearToken();
  showLogin();
});

async function initAdminPanel() {
  try {
    categories = await getCategoriesCached();
  } catch (err) {
    vfToast("Could not load categories.", true);
    return;
  }
  populateCategorySelect();
  populateSubtypeSelect(document.getElementById("fCategory").value);

  document.getElementById("fCategory").addEventListener("change", (e) => {
    populateSubtypeSelect(e.target.value);
  });
  document.getElementById("fImage").addEventListener("change", handleImageSelect);
  document.getElementById("sareeForm").addEventListener("submit", handleFormSubmit);
  document.getElementById("cancelEdit").addEventListener("click", resetForm);
  document.getElementById("resetBtn").addEventListener("click", handleReset);

  await renderTable();
}

function populateCategorySelect() {
  const sel = document.getElementById("fCategory");
  sel.innerHTML = categories.map(c => `<option value="${c.slug}">${c.label}</option>`).join("");
}

function populateSubtypeSelect(catSlug) {
  const sel = document.getElementById("fSubtype");
  const cat = getCategoryFrom(categories, catSlug) || categories[0];
  sel.innerHTML = cat.subtypes.map(s => `<option value="${s}">${s}</option>`).join("");
}

function handleImageSelect(e) {
  const file = e.target.files[0];
  pendingImageFile = file || null;
  const preview = document.getElementById("fImagePreview");
  if (!file) { preview.style.display = "none"; return; }
  const reader = new FileReader();
  reader.onload = (ev) => {
    preview.src = ev.target.result;
    preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const saveBtn = document.getElementById("saveBtn");
  const editId = document.getElementById("editId").value;

  const formData = new FormData();
  formData.append("name", document.getElementById("fName").value.trim());
  formData.append("category", document.getElementById("fCategory").value);
  formData.append("subtype", document.getElementById("fSubtype").value);
  formData.append("price", document.getElementById("fPrice").value);
  formData.append("fabric", document.getElementById("fFabric").value.trim());
  formData.append("description", document.getElementById("fDesc").value.trim());
  formData.append("featured", document.getElementById("fFeatured").checked);
  if (pendingImageFile) formData.append("image", pendingImageFile);

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    if (editId) {
      await api.updateSaree(editId, formData);
      vfToast("Saree updated");
    } else {
      await api.addSaree(formData);
      vfToast("Saree added to catalog");
    }
    resetForm();
    await renderTable();
  } catch (err) {
    vfToast(err.message || "Could not save this saree.", true);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save Saree";
  }
}

function resetForm() {
  document.getElementById("sareeForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("formTitle").textContent = "Add a new saree";
  document.getElementById("cancelEdit").style.display = "none";
  document.getElementById("fImagePreview").style.display = "none";
  pendingImageFile = null;
  populateSubtypeSelect(document.getElementById("fCategory").value);
}

async function renderTable() {
  let list = [];
  try {
    list = await api.getSarees();
  } catch (err) {
    vfToast("Could not load the catalog.", true);
    return;
  }
  document.getElementById("countLabel").textContent = list.length;
  const body = document.getElementById("tableBody");
  body.innerHTML = list.map(p => `
    <tr>
      <td><img src="${p.image}" alt="${p.name}"></td>
      <td>${p.name}${p.featured ? ' <span class="badge">Featured</span>' : ""}</td>
      <td>${getCategoryFrom(categories, p.category)?.label || p.category}</td>
      <td>${formatINR(p.price)}</td>
      <td>
        <div class="row-actions">
          <button data-edit="${p.id}">Edit</button>
          <button data-del="${p.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-edit]").forEach(btn =>
    btn.addEventListener("click", () => loadForEdit(Number(btn.dataset.edit), list))
  );
  body.querySelectorAll("[data-del]").forEach(btn =>
    btn.addEventListener("click", () => handleDelete(Number(btn.dataset.del)))
  );
}

async function handleDelete(id) {
  if (!confirm("Delete this saree from the catalog?")) return;
  try {
    await api.deleteSaree(id);
    vfToast("Saree deleted");
    await renderTable();
  } catch (err) {
    vfToast(err.message || "Could not delete this saree.", true);
  }
}

async function handleReset() {
  if (!confirm("Reset the catalog back to the original sample sarees? This removes any sarees you've added or edited.")) return;
  try {
    await api.resetSeed();
    vfToast("Catalog reset to sample data");
    await renderTable();
  } catch (err) {
    vfToast(err.message || "Could not reset the catalog.", true);
  }
}

function loadForEdit(id, list) {
  const p = list.find(s => s.id === id);
  if (!p) return;
  document.getElementById("editId").value = p.id;
  document.getElementById("fName").value = p.name;
  document.getElementById("fCategory").value = p.category;
  populateSubtypeSelect(p.category);
  document.getElementById("fSubtype").value = p.subtype;
  document.getElementById("fPrice").value = p.price;
  document.getElementById("fFabric").value = p.fabric;
  document.getElementById("fDesc").value = p.description;
  document.getElementById("fFeatured").checked = !!p.featured;
  const preview = document.getElementById("fImagePreview");
  preview.src = p.image;
  preview.style.display = "block";
  pendingImageFile = null;
  document.getElementById("formTitle").textContent = "Edit saree";
  document.getElementById("cancelEdit").style.display = "inline-flex";
  window.scrollTo({ top: document.getElementById("sareeForm").offsetTop - 100, behavior: "smooth" });
}

/* ---------- Boot ---------- */
if (api.isLoggedIn()) {
  showPanel();
} else {
  showLogin();
}
