const loginShell = document.getElementById("loginShell");
const adminPanel = document.getElementById("adminPanel");

let categories = [];
let pendingImageFile = null;
let pendingGalleryFiles = [];
let existingGalleryImages = []; // gallery URLs already saved for the saree being edited
let removedGalleryImages = [];  // subset of existingGalleryImages the admin asked to remove

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
document.getElementById("adminEmail").addEventListener("keydown", (e) => {
  if (e.key === "Enter") attemptLogin();
});

async function attemptLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const val = document.getElementById("adminPass").value;
  const errorEl = document.getElementById("loginError");
  errorEl.style.display = "none";
  try {
    await api.login(email, val);
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

document.getElementById("changePassBtn")?.addEventListener("click", () => {
  const card = document.getElementById("changePassCard");
  card.style.display = card.style.display === "none" ? "block" : "none";
});
document.getElementById("cpCancel")?.addEventListener("click", () => {
  document.getElementById("changePassCard").style.display = "none";
  document.getElementById("changePassForm").reset();
});
document.getElementById("changePassForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await api.changeAdminPassword({
      currentPassword: document.getElementById("cpCurrent").value,
      newPassword: document.getElementById("cpNew").value
    });
    vfToast("Password updated");
    document.getElementById("changePassForm").reset();
    document.getElementById("changePassCard").style.display = "none";
  } catch (err) {
    vfToast(err.message || "Could not change password.", true);
  } finally {
    btn.disabled = false;
  }
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
  document.getElementById("fGalleryImages").addEventListener("change", handleGalleryImageSelect);
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

function handleGalleryImageSelect(e) {
  pendingGalleryFiles = Array.from(e.target.files || []);
  renderGalleryPreview();
}

function renderGalleryPreview() {
  const wrap = document.getElementById("fGalleryPreview");
  const thumbs = [];

  existingGalleryImages
    .filter((url) => !removedGalleryImages.includes(url))
    .forEach((url) => {
      thumbs.push(`
        <div style="position:relative;">
          <img src="${url}" style="width:64px; height:80px; object-fit:cover; border-radius:4px;">
          <button type="button" data-remove-existing-gallery="${url}" title="Remove"
            style="position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; border:none; background:var(--ink-maroon); color:var(--white); font-size:.7rem; cursor:pointer;">✕</button>
        </div>`);
    });

  pendingGalleryFiles.forEach((file, i) => {
    thumbs.push(`<img data-pending-gallery-index="${i}" style="width:64px; height:80px; object-fit:cover; border-radius:4px; opacity:.85;">`);
  });

  wrap.innerHTML = thumbs.join("");

  wrap.querySelectorAll("[data-remove-existing-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removedGalleryImages.push(btn.dataset.removeExistingGallery);
      renderGalleryPreview();
    });
  });

  wrap.querySelectorAll("[data-pending-gallery-index]").forEach((img) => {
    const file = pendingGalleryFiles[Number(img.dataset.pendingGalleryIndex)];
    const reader = new FileReader();
    reader.onload = (ev) => { img.src = ev.target.result; };
    reader.readAsDataURL(file);
  });
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
  formData.append("bulkPrice", document.getElementById("fBulkPrice").value);
  formData.append("fabric", document.getElementById("fFabric").value.trim());
  formData.append("colours", document.getElementById("fColours").value.trim());
  formData.append("description", document.getElementById("fDesc").value.trim());
  formData.append("featured", document.getElementById("fFeatured").checked);
  formData.append("active", document.getElementById("fActive").checked);
  formData.append("stock", document.getElementById("fStock").value || "0");
  formData.append("balesAvailable", document.getElementById("fBalesAvailable").value || "0");
  formData.append("piecesPerBale", document.getElementById("fPiecesPerBale").value || "0");
  formData.append("costPerBale", document.getElementById("fCostPerBale").value || "0");
  if (pendingImageFile) formData.append("image", pendingImageFile);
  pendingGalleryFiles.forEach((file) => formData.append("images", file));
  if (removedGalleryImages.length) formData.append("removeImages", JSON.stringify(removedGalleryImages));

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
  document.getElementById("fActive").checked = true;
  document.getElementById("formTitle").textContent = "Add a new saree";
  document.getElementById("cancelEdit").style.display = "none";
  document.getElementById("fImagePreview").style.display = "none";
  pendingImageFile = null;
  pendingGalleryFiles = [];
  existingGalleryImages = [];
  removedGalleryImages = [];
  document.getElementById("fGalleryImages").value = "";
  document.getElementById("fGalleryPreview").innerHTML = "";
  populateSubtypeSelect(document.getElementById("fCategory").value);
}

async function renderTable() {
  let list = [];
  try {
    list = await api.adminGetSarees();
  } catch (err) {
    vfToast("Could not load the catalog.", true);
    return;
  }
  document.getElementById("countLabel").textContent = list.length;
  const body = document.getElementById("tableBody");
  body.innerHTML = list.map(p => `
    <tr${p.active === false ? ' style="opacity:.55;"' : ""}>
      <td><img src="${p.image}" alt="${p.name}"></td>
      <td>${p.name}${p.featured ? ' <span class="badge">Featured</span>' : ""}${p.active === false ? ' <span class="badge">Inactive</span>' : ""}</td>
      <td>${getCategoryFrom(categories, p.category)?.label || p.category}</td>
      <td>${formatINR(p.price)}</td>
      <td>${p.stock <= 0 ? '<strong style="color:var(--ink-maroon);">Out</strong>' : p.stock <= 5 ? `<strong style="color:var(--ink-maroon);">${p.stock} left</strong>` : p.stock}</td>
      <td>
        <div class="row-actions">
          <button data-edit="${p.id}">Edit</button>
          <button data-del="${p.id}">Delete</button>
        </div>
      </td>
    </tr>
  `).join("");

  body.querySelectorAll("[data-edit]").forEach(btn =>
    btn.addEventListener("click", () => loadForEdit(btn.dataset.edit, list))
  );
  body.querySelectorAll("[data-del]").forEach(btn =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.del))
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
  document.getElementById("fBulkPrice").value = p.bulkPrice ?? "";
  document.getElementById("fFabric").value = p.fabric;
  document.getElementById("fColours").value = (p.colours || []).join(", ");
  document.getElementById("fDesc").value = p.description;
  document.getElementById("fFeatured").checked = !!p.featured;
  document.getElementById("fActive").checked = p.active !== false;
  document.getElementById("fStock").value = p.stock ?? 0;
  document.getElementById("fBalesAvailable").value = p.bales?.available ?? 0;
  document.getElementById("fPiecesPerBale").value = p.bales?.piecesPerBale ?? 0;
  document.getElementById("fCostPerBale").value = p.bales?.costPerBale ?? 0;
  const preview = document.getElementById("fImagePreview");
  preview.src = p.image;
  preview.style.display = "block";
  pendingImageFile = null;
  pendingGalleryFiles = [];
  existingGalleryImages = p.images || [];
  removedGalleryImages = [];
  document.getElementById("fGalleryImages").value = "";
  renderGalleryPreview();
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