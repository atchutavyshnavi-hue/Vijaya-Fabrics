/* Admin Complaints management + CRM analytics dashboard — separate tabs
   inside admin.html. Charts are plain CSS bars (no external chart library),
   and every number they show comes straight from a live backend aggregation
   — never hard-coded or estimated client-side. */

const COMPLAINT_STATUS_LIST = ["Open", "In Review", "Resolved", "Closed"];

let complaintsState = { status: "all" };

/* ---------- Complaints ---------- */
function renderComplaintFilters() {
  const wrap = document.getElementById("complaintStatusFilters");
  const chips = ["all", ...COMPLAINT_STATUS_LIST];
  wrap.innerHTML = chips.map(s => `
    <button class="chip ${complaintsState.status === s ? "active" : ""}" data-complaint-filter="${s}">
      ${s === "all" ? "All" : s}
    </button>`).join("");
  wrap.querySelectorAll("[data-complaint-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      complaintsState.status = btn.dataset.complaintFilter;
      renderComplaintFilters();
      loadComplaints();
    });
  });
}

function complaintRowHtml(c) {
  const date = new Date(c.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const customerLine = c.customer
    ? `${c.customer.name}<br><span style="color:var(--charcoal-soft); font-size:.78rem;">${c.customer.email}</span>`
    : "—";
  return `
    <tr>
      <td><strong>${c.subject}</strong></td>
      <td>${customerLine}</td>
      <td style="font-size:.8rem;">${c.orderNumber || "—"}</td>
      <td style="max-width:240px; font-size:.8rem;">${c.description}</td>
      <td>
        <select data-complaint-status="${c.id}" style="font-size:.78rem; padding:4px 6px; border-radius:6px; border:1px solid var(--line);">
          ${COMPLAINT_STATUS_LIST.map(s => `<option value="${s}" ${s === c.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td>
        <input type="text" data-complaint-note="${c.id}" value="${(c.adminNote || "").replace(/"/g, "&quot;")}" placeholder="Add a note…" style="font-size:.78rem; padding:4px 6px; border-radius:6px; border:1px solid var(--line); width:140px;">
      </td>
      <td style="font-size:.76rem;">${date}</td>
    </tr>`;
}

async function loadComplaints() {
  const body = document.getElementById("complaintTableBody");
  const empty = document.getElementById("complaintsEmptyState");
  try {
    const complaints = await api.adminComplaints.list(complaintsState);
    document.getElementById("complaintCountLabel").textContent = complaints.length;
    if (!complaints.length) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    body.innerHTML = complaints.map(complaintRowHtml).join("");

    body.querySelectorAll("[data-complaint-status]").forEach(sel => {
      const original = sel.value;
      sel.addEventListener("change", async () => {
        const id = sel.dataset.complaintStatus;
        sel.disabled = true;
        try {
          await api.adminComplaints.updateStatus(id, { status: sel.value });
          vfToast(`Complaint marked as ${sel.value}`);
        } catch (err) {
          vfToast(err.message || "Could not update this complaint.", true);
          sel.value = original;
        } finally {
          sel.disabled = false;
        }
      });
    });

    body.querySelectorAll("[data-complaint-note]").forEach(input => {
      input.addEventListener("change", async () => {
        const id = input.dataset.complaintNote;
        input.disabled = true;
        try {
          await api.adminComplaints.updateStatus(id, { adminNote: input.value });
          vfToast("Note saved");
        } catch (err) {
          vfToast(err.message || "Could not save this note.", true);
        } finally {
          input.disabled = false;
        }
      });
    });
  } catch (err) {
    vfToast(err.message || "Could not load complaints.", true);
  }
}

/* ---------- CRM Dashboard (dependency-free CSS bar charts) ---------- */
function barChartHtml(rows, { valueKey, labelKey, formatValue }) {
  if (!rows.length) return `<p style="color:var(--charcoal-soft); font-size:.85rem;">No data yet.</p>`;
  const max = Math.max(...rows.map(r => r[valueKey]), 1);
  return `
    <div style="display:flex; flex-direction:column; gap:10px;">
      ${rows.map(r => `
        <div>
          <div style="display:flex; justify-content:space-between; font-size:.8rem; margin-bottom:3px;">
            <span>${r[labelKey]}</span>
            <strong>${formatValue ? formatValue(r[valueKey]) : r[valueKey]}</strong>
          </div>
          <div style="background:var(--ivory-deep); border-radius:5px; overflow:hidden; height:10px;">
            <div style="background:var(--zari-gold); height:100%; width:${(r[valueKey] / max) * 100}%;"></div>
          </div>
        </div>`).join("")}
    </div>`;
}

async function loadCrmDashboard() {
  const els = {
    totalOrders: document.getElementById("crmTotalOrders"),
    delivered: document.getElementById("crmDelivered"),
    cancelled: document.getElementById("crmCancelled"),
    pending: document.getElementById("crmPending"),
    revenue: document.getElementById("crmRevenue"),
    complaints: document.getElementById("crmComplaints"),
    monthlyChart: document.getElementById("crmMonthlyChart"),
    statusChart: document.getElementById("crmStatusChart"),
    categoryChart: document.getElementById("crmCategoryChart"),
    complaintChart: document.getElementById("crmComplaintChart")
  };
  try {
    const data = await api.crm.summary();

    els.totalOrders.textContent = data.totalOrders;
    els.delivered.textContent = data.delivered;
    els.cancelled.textContent = data.cancelled;
    els.pending.textContent = data.pending;
    els.revenue.textContent = formatINR(data.totalRevenue);
    els.complaints.textContent = data.totalComplaints;

    els.monthlyChart.innerHTML = barChartHtml(
      data.monthly.map(m => ({ label: m.label, value: m.revenue, count: m.count })),
      { valueKey: "value", labelKey: "label", formatValue: (v) => formatINR(v) }
    );

    const statusRows = Object.entries(data.ordersByStatus).map(([status, count]) => ({ status, count }));
    els.statusChart.innerHTML = barChartHtml(statusRows, { valueKey: "count", labelKey: "status" });

    els.categoryChart.innerHTML = barChartHtml(
      data.categoryPerformance.map(c => ({ label: c.category, value: c.revenue })),
      { valueKey: "value", labelKey: "label", formatValue: (v) => formatINR(v) }
    );

    const complaintRows = Object.entries(data.complaintsByStatus).map(([status, count]) => ({ status, count }));
    els.complaintChart.innerHTML = barChartHtml(complaintRows, { valueKey: "count", labelKey: "status" });
  } catch (err) {
    vfToast(err.message || "Could not load the CRM dashboard.", true);
  }
}