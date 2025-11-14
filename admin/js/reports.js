/* ============================================================
   reports.js — Issue Reports Management
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import {
    showToast,
    confirmBox,
    formatDate,
} from "./utils.js";

import {
    dbSelect,
    dbUpdate,
    dbDelete
} from "./supabase.js";

// In-memory cache
let REPORTS = [];
let BUYERS = [];
let ORDERS = [];

/* -------------------------------------------------------------
   Exported for admin.js
------------------------------------------------------------- */

export async function initReportsModule() {
    await loadAuxData();
    await loadReportsFromDB();
    renderReportsPanel();
}

/* -------------------------------------------------------------
   Load reports + related buyers/orders
------------------------------------------------------------- */

async function loadAuxData() {
    // Optional: for displaying buyer name or order info
    const buyers = await dbSelect("buyers", {});
    const orders = await dbSelect("orders", {});

    BUYERS = buyers || [];
    ORDERS = orders || [];
}

async function loadReportsFromDB() {
    const data = await dbSelect("reports", {
        order: { column: "created_at", asc: false }
    });

    REPORTS = data || [];
}

/* -------------------------------------------------------------
   Helpers to resolve buyer / order labels
------------------------------------------------------------- */

function getBuyerName(buyer_id) {
    if (!buyer_id) return "";
    const b = BUYERS.find(x => x.id === buyer_id);
    return b?.name || `Buyer #${buyer_id}`;
}

function getOrderLabel(order_id) {
    if (!order_id) return "";
    const o = ORDERS.find(x => x.id === order_id);
    if (!o) return order_id;
    return `${order_id} (${o.product_id || "product"})`;
}

/* -------------------------------------------------------------
   RENDER: Reports Panel (panel-reports)
------------------------------------------------------------- */

function renderReportsPanel() {
    const panel = document.getElementById("panel-reports");
    if (!panel) return;

    const statuses = [
        { value: "", label: "All" },
        { value: "open", label: "Open" },
        { value: "in_progress", label: "In-progress" },
        { value: "resolved", label: "Resolved" },
        { value: "closed", label: "Closed" }
    ];

    const filterSelect = `
        <select id="rep-status-filter" class="form-select form-select-sm" style="max-width:200px;">
            ${statuses.map(s => `<option value="${s.value}">${s.label}</option>`).join("")}
        </select>
    `;

    const content = `
        <div class="card-clean">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="mb-0">Reports</h3>
                <div class="d-flex align-items-center gap-2">
                    <span class="text-muted small">Filter by Status:</span>
                    ${filterSelect}
                </div>
            </div>

            <div id="reports-list-inner"></div>
        </div>
    `;

    panel.innerHTML = content;

    const sel = document.getElementById("rep-status-filter");
    if (sel) {
        sel.addEventListener("change", () => renderReportsList(sel.value));
    }

    renderReportsList("");
}

function renderReportsList(filterStatus = "") {
    const container = document.getElementById("reports-list-inner");
    if (!container) return;

    let list = [...REPORTS];

    if (filterStatus) {
        list = list.filter(
            r => (r.status || "").toLowerCase() === filterStatus.toLowerCase()
        );
    }

    if (!list.length) {
        container.innerHTML = `
            <p class="text-muted mb-0">No reports found for this filter.</p>
        `;
        return;
    }

    const statusLabel = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "in_progress") return "In-progress";
        if (s === "resolved") return "Resolved";
        if (s === "closed") return "Closed";
        return "Open";
    };

    const statusBadgeClass = (status) => {
        const s = (status || "").toLowerCase();
        if (s === "in_progress") return "badge bg-warning text-dark";
        if (s === "resolved") return "badge bg-success";
        if (s === "closed") return "badge bg-secondary";
        return "badge bg-danger";
    };

    const cards = list.map(r => {
        const buyerName = getBuyerName(r.buyer_id);
        const orderLabel = getOrderLabel(r.order_id);
        const created = r.created_at ? formatDate(r.created_at) : "";

        const screenshotLink = r.screenshot_url
            ? `<a href="${r.screenshot_url}" target="_blank">View Screenshot</a>`
            : `<span class="text-muted">No screenshot</span>`;

        const selectId = `rep-status-${r.id}`;

        return `
            <div class="card-clean mb-2">
                <div class="d-flex justify-content-between">
                    <div style="max-width:75%;">
                        <div class="mb-1">
                            <span class="${statusBadgeClass(r.status)}">
                                ${statusLabel(r.status)}
                            </span>
                        </div>
                        <div class="small text-muted mb-1">
                            Report ID: ${r.id} &middot; ${created ? `Created: ${created}` : ""}
                        </div>
                        <div class="small">
                            ${orderLabel ? `<b>Order:</b> ${orderLabel}<br>` : ""}
                            ${buyerName ? `<b>Buyer:</b> ${buyerName}<br>` : ""}
                        </div>
                        <div class="mt-2">
                            <b>Issue:</b><br>
                            <span>${r.issue_description || ""}</span>
                        </div>
                        <div class="mt-2">
                            ${screenshotLink}
                        </div>
                    </div>

                    <div class="text-end" style="min-width:180px;">
                        <div class="mb-2">
                            <select id="${selectId}" class="form-select form-select-sm">
                                <option value="open" ${isSelected(r.status, "open")}>Open</option>
                                <option value="in_progress" ${isSelected(r.status, "in_progress")}>In-progress</option>
                                <option value="resolved" ${isSelected(r.status, "resolved")}>Resolved</option>
                                <option value="closed" ${isSelected(r.status, "closed")}>Closed</option>
                            </select>
                        </div>
                        <button class="btn btn-sm btn-primary mb-1"
                                onclick="window.updateReportStatus(${r.id})">
                            Update Status
                        </button><br>
                        <button class="btn btn-sm btn-danger"
                                onclick="window.deleteReport(${r.id})">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = cards;
}

function isSelected(current, value) {
    return (current || "").toLowerCase() === value ? "selected" : "";
}

/* -------------------------------------------------------------
   ACTION: Update Status
------------------------------------------------------------- */

window.updateReportStatus = async function (id) {
    const r = REPORTS.find(x => x.id === id);
    if (!r) return;

    const selectId = `rep-status-${id}`;
    const sel = document.getElementById(selectId);
    if (!sel) return;

    const newStatus = sel.value;

    if ((r.status || "").toLowerCase() === newStatus.toLowerCase()) {
        showToast("Status is unchanged.", "info");
        return;
    }

    const updated = await dbUpdate("reports", { id }, { status: newStatus });
    if (updated === null) return;

    showToast("Report status updated.", "success");

    await loadReportsFromDB();
    const filterSel = document.getElementById("rep-status-filter");
    const currentFilter = filterSel ? filterSel.value : "";
    renderReportsList(currentFilter);
};

/* -------------------------------------------------------------
   ACTION: Delete Report
------------------------------------------------------------- */

window.deleteReport = async function (id) {
    const r = REPORTS.find(x => x.id === id);
    if (!r) return;

    const ok = await confirmBox("Delete this report permanently?");
    if (!ok) return;

    const deleted = await dbDelete("reports", { id });
    if (deleted === null) return;

    showToast("Report deleted.", "error");

    await loadReportsFromDB();
    const filterSel = document.getElementById("rep-status-filter");
    const currentFilter = filterSel ? filterSel.value : "";
    renderReportsList(currentFilter);
};