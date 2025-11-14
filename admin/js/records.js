// ===============================================
// records.js — SOLD ACCOUNTS & RECORDS MODULE
// ===============================================

import {
    fill,
    showToast,
    generateId
} from "./utils.js";

import {
    fetchTable,
    updateRow,
    deleteRow
} from "./supabase.js";

import { loadProducts } from "./products.js";

// Internal
let RECORDS = [];
let PRODUCTS = [];

// ===============================================
// INIT MODULE
// ===============================================
export async function initRecordsModule() {
    PRODUCTS = await loadProducts();
    await loadRecordsFromDB();
    renderSoldList();
    renderRecordsTable();
}

// ===============================================
// DASHBOARD — TOTAL REVENUE
// ===============================================
export async function refreshRevenueStats() {
    const total = RECORDS.reduce((sum, r) => sum + (r.price || 0), 0);
    document.getElementById("stat-revenue").textContent = "₱" + total;
}

// ===============================================
// LOAD RECORDS FROM SUPABASE
// ===============================================
async function loadRecordsFromDB() {
    RECORDS = await fetchTable("records");
}

// ===============================================
// SOLD ACCOUNTS (summary list)
// ===============================================
function renderSoldList() {
    const html = RECORDS.map(r => {
        const p = PRODUCTS.find(x => x.id === r.product_id);

        return `
            <div class="card-clean mb-3">
                <h5>${p?.name || "Unknown Product"}</h5>
                <div><b>Buyer:</b> ${r.buyer}</div>
                <div><b>Type:</b> ${r.account_type}</div>
                <div><b>Duration:</b> ${r.duration}</div>
                <div><b>Price:</b> ₱${r.price}</div>

                <div class="text-end mt-3">
                    <button class="btn btn-warning btn-sm" onclick="editRecord('${r.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="removeRecord('${r.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join("");

    fill("panel-sold-accounts", html || "<p>No sold accounts yet.</p>");
}

// ===============================================
// FULL RECORDS TABLE (Admin Table)
// ===============================================
function renderRecordsTable() {
    if (RECORDS.length === 0) {
        fill("records-table-body", `
            <tr><td colspan="12" class="text-center">No records found.</td></tr>
        `);
        return;
    }

    const html = RECORDS.map(r => {
        const p = PRODUCTS.find(x => x.id === r.product_id);

        const expiration = computeExpiration(r.purchase_date, r.duration, r.additional_days);

        return `
            <tr>
                <td>${r.order_id}</td>
                <td>${r.buyer}</td>
                <td>${r.source}</td>
                <td>${p?.name || "Unknown"}</td>
                <td>${r.account_type}</td>
                <td>${r.duration}</td>
                <td>${r.purchase_date}</td>
                <td>${expiration.original}</td>
                <td>${r.additional_days}</td>
                <td>${expiration.updated}</td>
                <td>
                    ${r.email ? `Email: ${r.email}<br>` : ""}
                    ${r.password ? `Pass: ${r.password}<br>` : ""}
                    ${r.profile ? `Profile: ${r.profile}<br>` : ""}
                    ${r.pin ? `PIN: ${r.pin}` : ""}
                </td>
                <td>₱${r.price}</td>
                <td>
                    <button class="btn btn-warning btn-sm" onclick="editRecord('${r.id}')">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="removeRecord('${r.id}')">Delete</button>
                </td>
            </tr>
        `;
    }).join("");

    fill("records-table-body", html);
}

// ===============================================
// EXPIRATION CALCULATION
// ===============================================
function computeExpiration(purchaseDate, durationKey, addDays) {
    const base = new Date(purchaseDate);

    const num = parseInt(durationKey);
    const isDays = durationKey.endsWith("d");
    const isMonths = durationKey.endsWith("m");

    let original = new Date(base);

    if (isDays) original.setDate(original.getDate() + num);
    if (isMonths) original.setMonth(original.getMonth() + num);

    // Additional days
    let updated = new Date(original);
    updated.setDate(updated.getDate() + (addDays || 0));

    const fmt = d => d.toISOString().split("T")[0];

    return {
        original: fmt(original),
        updated: fmt(updated)
    };
}

// ===============================================
// EDIT RECORD — PREFILL FORM
// ===============================================
window.editRecord = function (recordId) {
    const r = RECORDS.find(x => x.id === recordId);
    if (!r) return;

    document.querySelector(`[data-target="panel-records"]`).click();

    document.getElementById("record-orderid").value = r.order_id;
    document.getElementById("record-buyer").value = r.buyer;
    document.getElementById("record-source").value = r.source;
    document.getElementById("record-product").value = r.product_id;
    document.getElementById("record-type").value = r.account_type;
    document.getElementById("record-duration").value = r.duration;
    document.getElementById("record-purchasedate").value = r.purchase_date;
    document.getElementById("record-adddays").value = r.additional_days;
    document.getElementById("record-email").value = r.email || "";
    document.getElementById("record-password").value = r.password || "";
    document.getElementById("record-profile").value = r.profile || "";
    document.getElementById("record-pin").value = r.pin || "";
    document.getElementById("record-price").value = r.price;

    document.getElementById("recordFormMode").value = recordId; // track editing

    showToast("Record loaded. After editing, click SAVE.", "info");
};

// ===============================================
// SAVE EDITED RECORD
// Called from inline HTML Save button
// ===============================================
window.saveEditedRecord = async function () {
    const id = document.getElementById("recordFormMode").value;
    if (!id) return;

    const updated = {
        order_id: document.getElementById("record-orderid").value,
        buyer: document.getElementById("record-buyer").value,
        source: document.getElementById("record-source").value,
        product_id: document.getElementById("record-product").value,
        account_type: document.getElementById("record-type").value,
        duration: document.getElementById("record-duration").value,
        purchase_date: document.getElementById("record-purchasedate").value,
        additional_days: Number(document.getElementById("record-adddays").value),
        email: document.getElementById("record-email").value,
        password: document.getElementById("record-password").value,
        profile: document.getElementById("record-profile").value,
        pin: document.getElementById("record-pin").value,
        price: Number(document.getElementById("record-price").value),
    };

    await updateRow("records", { id }, updated);

    showToast("Record updated!", "success");

    await loadRecordsFromDB();
    renderRecordsTable();
    renderSoldList();
    refreshRevenueStats();
};

// ===============================================
// DELETE RECORD
// ===============================================
window.removeRecord = async function (id) {
    if (!confirm("Delete this record?")) return;

    await deleteRow("records", { id });

    showToast("Record deleted.", "danger");

    await loadRecordsFromDB();
    renderRecordsTable();
    renderSoldList();
    refreshRevenueStats();
};
