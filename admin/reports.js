// ===============================================
// reports.js — USER REPORTS MANAGEMENT MODULE
// ===============================================

import {
    fill,
    showToast
} from "./utils.js";

import {
    fetchTable,
    updateRow,
    deleteRow
} from "./supabase.js";

// Internal
let REPORTS = [];

// ===============================================
// INIT MODULE
// ===============================================
export async function initReportsModule() {
    await loadReportsFromDB();
    renderReportsPanel();
}

// ===============================================
// LOAD REPORTS
// ===============================================
async function loadReportsFromDB() {
    REPORTS = await fetchTable("reports");
}

// ===============================================
// RENDER ENTIRE REPORTS PANEL
// ===============================================
function renderReportsPanel() {
    if (REPORTS.length === 0) {
        fill("panel-reports", "<p>No reports found.</p>");
        return;
    }

    const html = REPORTS.map(r => `
        <div class="card-clean mb-3">
            <h5>Report #${r.id}</h5>

            <div><b>Order ID:</b> ${r.order_id || "None"}</div>
            <div><b>Buyer ID:</b> ${r.buyer_id}</div>
            <div><b>Issue:</b> ${r.issue_description}</div>

            ${r.screenshot_url ? `<img src="${r.screenshot_url}" class="img-fluid mt-2" style="max-width: 200px;">` : ""}

            <div class="mt-2"><b>Status:</b> 
                <span class="badge ${r.status === "open" ? "bg-danger" : "bg-success"}">
                    ${r.status}
                </span>
            </div>

            <div class="text-end mt-3">
                ${r.status === "open" ? `
                    <button class="btn btn-success btn-sm" onclick="resolveReport('${r.id}')">
                        Mark Resolved
                    </button>
                ` : ""}

                <button class="btn btn-danger btn-sm" onclick="deleteReport('${r.id}')">
                    Delete
                </button>
            </div>
        </div>
    `).join("");

    fill("panel-reports", html);
}

// ===============================================
// RESOLVE REPORT
// ===============================================
window.resolveReport = async function (id) {
    const ok = await updateRow("reports", { id }, { status: "resolved" });
    if (!ok) return;

    showToast("Report marked as resolved!", "success");

    await loadReportsFromDB();
    renderReportsPanel();
};

// ===============================================
// DELETE REPORT
// ===============================================
window.deleteReport = async function (id) {
    if (!confirm("Delete this report?")) return;

    const ok = await deleteRow("reports", { id });
    if (!ok) return;

    showToast("Report deleted.", "danger");

    await loadReportsFromDB();
    renderReportsPanel();
};
