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

/* ---------- CRM Dashboard (dependency-free CSS/SVG charts) ----------
   Every chart supports Bar / Pie / Line via its own dropdown. No external
   chart library — plain CSS bars, a conic-gradient pie, and a small inline
   SVG line chart. Data always comes straight from the live /crm/summary
   aggregation; only the chosen chart TYPE is client-side state. */

const CHART_PALETTE = ["#C68A2E", "#6B1B24", "#1F4B4A", "#E4B863", "#8A5B14", "#4A1119", "#2B211B", "#5A4E44"];

let chartTypeState = { monthly: "bar", status: "bar", category: "bar", complaint: "bar" };
let lastCrmData = null; // cached so switching chart type doesn't need a refetch

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

function pieChartHtml(rows, { valueKey, labelKey, formatValue }) {
  const total = rows.reduce((sum, r) => sum + r[valueKey], 0);
  if (!total) return `<p style="color:var(--charcoal-soft); font-size:.85rem;">No data yet.</p>`;
  let cumulative = 0;
  const segments = rows.map((r, i) => {
    const start = (cumulative / total) * 360;
    cumulative += r[valueKey];
    const end = (cumulative / total) * 360;
    return `${CHART_PALETTE[i % CHART_PALETTE.length]} ${start}deg ${end}deg`;
  }).join(", ");
  const legend = rows.map((r, i) => `
    <div style="display:flex; align-items:center; gap:7px; font-size:.8rem; margin-bottom:5px;">
      <span style="width:10px; height:10px; border-radius:50%; background:${CHART_PALETTE[i % CHART_PALETTE.length]}; flex-shrink:0;"></span>
      <span>${r[labelKey]}</span>
      <strong style="margin-left:auto;">${formatValue ? formatValue(r[valueKey]) : r[valueKey]}</strong>
    </div>`).join("");
  return `
    <div style="display:flex; gap:22px; align-items:center; flex-wrap:wrap;">
      <div style="width:130px; height:130px; border-radius:50%; background:conic-gradient(${segments}); flex-shrink:0;"></div>
      <div style="flex:1; min-width:150px;">${legend}</div>
    </div>`;
}

function lineChartHtml(rows, { valueKey, labelKey, formatValue }) {
  if (!rows.length) return `<p style="color:var(--charcoal-soft); font-size:.85rem;">No data yet.</p>`;
  const w = 340, h = 160, pad = 30;
  const max = Math.max(...rows.map(r => r[valueKey]), 1);
  const stepX = rows.length > 1 ? (w - 2 * pad) / (rows.length - 1) : 0;
  const points = rows.map((r, i) => ({
    x: pad + i * stepX,
    y: h - pad - (r[valueKey] / max) * (h - 2 * pad),
    row: r
  }));
  const polyline = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const dots = points.map(p => `
    <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#C68A2E">
      <title>${p.row[labelKey]}: ${formatValue ? formatValue(p.row[valueKey]) : p.row[valueKey]}</title>
    </circle>`).join("");
  const labels = points.map(p => `
    <text x="${p.x.toFixed(1)}" y="${h - 8}" font-size="9" text-anchor="middle" fill="#5A4E44">${p.row[labelKey]}</text>`).join("");
  return `
    <svg viewBox="0 0 ${w} ${h}" style="width:100%; max-width:380px; height:auto;">
      <polyline points="${polyline}" fill="none" stroke="#C68A2E" stroke-width="2"></polyline>
      ${dots}
      ${labels}
    </svg>`;
}

function renderChart(containerId, chartKey, rows, opts) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const type = chartTypeState[chartKey] || "bar";
  if (type === "pie") el.innerHTML = pieChartHtml(rows, opts);
  else if (type === "line") el.innerHTML = lineChartHtml(rows, opts);
  else el.innerHTML = barChartHtml(rows, opts);
}

function renderAllCharts() {
  if (!lastCrmData) return;
  const data = lastCrmData;

  renderChart(
    "crmMonthlyChart", "monthly",
    data.monthly.map(m => ({ label: m.label, value: m.revenue, count: m.count })),
    { valueKey: "value", labelKey: "label", formatValue: (v) => formatINR(v) }
  );

  const statusRows = Object.entries(data.ordersByStatus).map(([status, count]) => ({ status, count }));
  renderChart("crmStatusChart", "status", statusRows, { valueKey: "count", labelKey: "status" });

  renderChart(
    "crmCategoryChart", "category",
    data.categoryPerformance.map(c => ({ label: c.category, value: c.revenue })),
    { valueKey: "value", labelKey: "label", formatValue: (v) => formatINR(v) }
  );

  const complaintRows = Object.entries(data.complaintsByStatus).map(([status, count]) => ({ status, count }));
  renderChart("crmComplaintChart", "complaint", complaintRows, { valueKey: "count", labelKey: "status" });
}

document.querySelectorAll(".chart-type-select").forEach((sel) => {
  sel.value = chartTypeState[sel.dataset.chart] || "bar";
  sel.addEventListener("change", () => {
    chartTypeState[sel.dataset.chart] = sel.value;
    renderAllCharts();
  });
});

async function loadCrmDashboard() {
  const els = {
    totalOrders: document.getElementById("crmTotalOrders"),
    delivered: document.getElementById("crmDelivered"),
    cancelled: document.getElementById("crmCancelled"),
    pending: document.getElementById("crmPending"),
    revenue: document.getElementById("crmRevenue"),
    complaints: document.getElementById("crmComplaints")
  };
  try {
    const data = await api.crm.summary();
    lastCrmData = data;

    els.totalOrders.textContent = data.totalOrders;
    els.delivered.textContent = data.delivered;
    els.cancelled.textContent = data.cancelled;
    els.pending.textContent = data.pending;
    els.revenue.textContent = formatINR(data.totalRevenue);
    els.complaints.textContent = data.totalComplaints;

    renderAllCharts();
  } catch (err) {
    vfToast(err.message || "Could not load the CRM dashboard.", true);
  }
}