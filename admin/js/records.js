/* ============================================================
   records.js — Sold Accounts / Records Management
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import {
    showToast,
    confirmBox,
    formatDate,
    addDays,
    cleanText,
    generateId
} from "./utils.js";

import {
    dbSelect,
    dbInsert,
    dbUpdate,
    dbDelete
} from "./supabase.js";

import { getProducts } from "./products.js";

// In-memory cache
let RECORDS = [];
let PRODUCTS = [];

/* -------------------------------------------------------------
   Exports for admin.js & others
------------------------------------------------------------- */

export async function initRecordsModule() {
    PRODUCTS = getProducts();
    await loadRecordsFromDB();
    renderRecordsTable();
    renderSoldAccountsPanel();
}

export async function refreshRevenueStats() {
    if (!RECORDS.length) await loadRecordsFromDB();
    const total = RECORDS.reduce((sum, r) => sum + Number(r.price || 0), 0);
    const el = document.getElementById("stat-revenue");
    if (el) el.textContent = "₱" + total.toFixed(2);
}

/* -------------------------------------------------------------
   Load records from DB
------------------------------------------------------------- */

async function loadRecordsFromDB() {
    const data = await dbSelect("records", {
        order: { column: "created_at", asc: false }
    });

    RECORDS = data || [];
}

/* -------------------------------------------------------------
   RENDER: Records Table (panel-records > tbody#records-table-body)
------------------------------------------------------------- */

function renderRecordsTable() {
    const tbody = document.getElementById("records-table-body");
    if (!tbody) return;

    if (!RECORDS.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="13" class="text-center text-muted">No records yet.</td>
            </tr>
        `;
        return;
    }

    const rows = RECORDS.map(r => {
        const product = PRODUCTS.find(p => p.id === r.product_id);
        const productName = product?.name || r.product_id || "Unknown";

        const purchase = r.purchase_date ? formatDate(r.purchase_date) : "";
        const baseExp = purchase || ""; // simple fallback
        const updatedExp = r.additional_days
            ? addDays(purchase, Number(r.additional_days))
            : baseExp;

        const credsLines = [];
        if (r.email) credsLines.push(`Email: ${r.email}`);
        if (r.password) credsLines.push(`Password: ${r.password}`);
        if (r.profile) credsLines.push(`Profile: ${r.profile}`);
        if (r.pin) credsLines.push(`PIN: ${r.pin}`);

        const creds = credsLines.join("<br>");

        return `
            <tr>
                <td>${r.order_id || "-"}</td>
                <td>${r.buyer}</td>
                <td>${r.source}</td>
                <td>${productName}</td>
                <td>${r.account_type}</td>
                <td>${r.duration}</td>
                <td>${purchase || "-"}</td>
                <td>${baseExp || "-"}</td>
                <td>${r.additional_days ?? 0}</td>
                <td>${updatedExp || "-"}</td>
                <td>${creds || "-"}</td>
                <td>₱${Number(r.price || 0).toFixed(2)}</td>
                <td>
                    <button class="btn btn-warning btn-sm mb-1"
                            onclick="window.editRecord('${r.id}')">
                        Edit
                    </button><br>
                    <button class="btn btn-danger btn-sm"
                            onclick="window.deleteRecord('${r.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    tbody.innerHTML = rows;
}

/* -------------------------------------------------------------
   RENDER: Sold Accounts Panel (panel-sold-accounts)
------------------------------------------------------------- */

function renderSoldAccountsPanel() {
    const panel = document.getElementById("panel-sold-accounts");
    if (!panel) return;

    const sold = RECORDS.filter(r => (r.status || "").toLowerCase() === "sold");

    if (!sold.length) {
        panel.innerHTML = `
            <div class="card-clean">
                <h3>Sold Accounts</h3>
                <p class="mb-0 text-muted">No sold records yet.</p>
            </div>
        `;
        return;
    }

    const cards = sold.map(r => {
        const product = PRODUCTS.find(p => p.id === r.product_id);
        const productName = product?.name || r.product_id || "Unknown";

        return `
            <div class="card-clean mb-2">
                <div class="d-flex justify-content-between">
                    <div>
                        <b>${productName}</b><br>
                        <span>${r.account_type} — ${r.duration}</span><br>
                        <span>Buyer: ${r.buyer}</span><br>
                        <span>Source: ${r.source}</span><br>
                        <span>Purchased: ${formatDate(r.purchase_date)}</span><br>
                        <span>Price: ₱${Number(r.price || 0).toFixed(2)}</span>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-sm btn-outline-primary"
                                onclick="window.editRecord('${r.id}')">
                            View / Edit
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    panel.innerHTML = `
        <h3>Sold Accounts</h3>
        ${cards}
    `;
}

/* -------------------------------------------------------------
   EDIT FLOW (uses the form inside panel-records)
------------------------------------------------------------- */

window.editRecord = function (id) {
    const r = RECORDS.find(x => x.id === id);
    if (!r) return;

    const idInput = document.getElementById("recordFormMode"); // hidden
    if (idInput) idInput.value = id;

    setValue("record-orderid", r.order_id || "");
    setValue("record-buyer", r.buyer || "");
    setValue("record-source", r.source || "");
    setValue("record-product", r.product_id || "");
    setValue("record-type", r.account_type || "");
    setValue("record-duration", r.duration || "");
    setValue("record-purchasedate", formatDate(r.purchase_date));
    setValue("record-adddays", r.additional_days ?? 0);
    setValue("record-email", r.email || "");
    setValue("record-password", r.password || "");
    setValue("record-profile", r.profile || "");
    setValue("record-pin", r.pin || "");
    setValue("record-price", r.price ?? 0);

    showToast("Record loaded into form. Edit then click Save.", "info");

    // Scroll to form
    const formAnchor = document.getElementById("record-orderid");
    if (formAnchor) formAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
};

function setValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value ?? "";
}

/* -------------------------------------------------------------
   SAVE Edited / New Record (triggered by Save button)
   - If recordFormMode has ID → update existing
   - If blank → create NEW manual record
------------------------------------------------------------- */

window.saveEditedRecord = async function () {
    const modeEl = document.getElementById("recordFormMode");

    const formId = modeEl?.value || null;

    const order_id = cleanText(getVal("record-orderid"));
    const buyer = cleanText(getVal("record-buyer"));
    const source = cleanText(getVal("record-source"));
    const product_id = cleanText(getVal("record-product"));
    const account_type = cleanText(getVal("record-type"));
    const duration = cleanText(getVal("record-duration"));
    const purchase_date = getVal("record-purchasedate") || null;
    const additional_days = Number(getVal("record-adddays") || 0);
    const email = cleanText(getVal("record-email"));
    const password = cleanText(getVal("record-password"));
    const profile = cleanText(getVal("record-profile"));
    const pin = cleanText(getVal("record-pin"));
    const price = Number(getVal("record-price") || 0);

    if (!buyer || !source || !product_id || !account_type || !duration || !purchase_date) {
        showToast("Please fill all required fields (buyer, source, product, type, duration, date).", "warning");
        return;
    }

    const payload = {
        order_id,
        buyer,
        source,
        product_id,
        account_type,
        duration,
        purchase_date,
        additional_days,
        email,
        password,
        profile,
        pin,
        price,
        status: "sold"
    };

    let success = false;

    if (formId) {
        // Update existing
        const updated = await dbUpdate("records", { id: formId }, payload);
        if (updated !== null) {
            showToast("Record updated.", "success");
            success = true;
        }
    } else {
        // Insert new manual record
        const newId = generateId("REC");
        const inserted = await dbInsert("records", {
            id: newId,
            ...payload,
            created_at: new Date().toISOString()
        });
        if (inserted !== null) {
            showToast("New record added.", "success");
            success = true;
        }
    }

    if (!success) return;

    // Refresh
    await loadRecordsFromDB();
    renderRecordsTable();
    renderSoldAccountsPanel();
    await refreshRevenueStats();

    // Clear form mode (so next save = new record)
    if (modeEl) modeEl.value = "";

    // Optionally clear form fields
    clearRecordForm();
};

function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : "";
}

function clearRecordForm() {
    const fields = [
        "record-orderid",
        "record-buyer",
        "record-source",
        "record-product",
        "record-type",
        "record-duration",
        "record-purchasedate",
        "record-adddays",
        "record-email",
        "record-password",
        "record-profile",
        "record-pin",
        "record-price"
    ];
    fields.forEach(id => setValue(id, ""));
}

/* -------------------------------------------------------------
   DELETE Record
------------------------------------------------------------- */

window.deleteRecord = async function (id) {
    const r = RECORDS.find(x => x.id === id);
    if (!r) return;

    const ok = await confirmBox(`Delete this record permanently?\n\nBuyer: ${r.buyer}\nProduct: ${r.product_id}`);
    if (!ok) return;

    const deleted = await dbDelete("records", { id });
    if (deleted === null) return;

    showToast("Record deleted.", "error");

    await loadRecordsFromDB();
    renderRecordsTable();
    renderSoldAccountsPanel();
    await refreshRevenueStats();
};