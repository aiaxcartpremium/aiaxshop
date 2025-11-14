// =======================================
// stocks.js — STOCK MANAGEMENT MODULE
// =======================================

import {
    fill,
    showToast,
    generateId
} from "./utils.js";

import {
    fetchTable,
    insertRow,
    updateRow,
    deleteRow
} from "./supabase.js";

import { loadProducts } from "./products.js";

// Internal memory
let STOCKS = [];
let PRODUCTS = [];

// =======================================
// INIT MODULE
// Called automatically by admin.js
// =======================================
export async function initStocksModule() {
    PRODUCTS = await fetchTable("products");
    await loadStocksFromDB();
    renderStockPanel();
    prepareAddStockPanel();
}

// =======================================
// DASHBOARD COUNT
// =======================================
export async function refreshStocksStats() {
    const count = STOCKS.filter(s => s.status === "available").length;
    document.getElementById("stat-stock").textContent = count;
}

// =======================================
// LOAD STOCK FROM DATABASE
// =======================================
export async function loadStocksFromDB() {
    STOCKS = await fetchTable("stocks");
}

// =======================================
// STOCK PANEL RENDER
// =======================================
function renderStockPanel() {
    const available = STOCKS.filter(s => s.status === "available");

    if (available.length === 0) {
        fill("panel-manage-stocks", "<p>No available stock.</p>");
        return;
    }

    const html = available.map(s => {
        const p = PRODUCTS.find(x => x.id === s.product_id);

        return `
            <div class="card-clean mb-3">
                <div class="d-flex justify-content-between">

                    <div>
                        <h5>${p?.name || "Unknown Product"}</h5>
                        <div><b>Type:</b> ${s.account_type}</div>
                        <div><b>Duration:</b> ${s.duration}</div>
                        <div><b>Email:</b> ${s.email}</div>
                        <div><b>Profile:</b> ${s.profile || "-"}</div>
                        <div><b>Auto Archive:</b> ${s.archive_after} days</div>
                    </div>

                    <div class="text-end">
                        <button class="btn btn-success btn-sm mb-1" onclick="markStockSold('${s.id}')">
                            Mark Sold
                        </button>
                        <button class="btn btn-warning btn-sm mb-1" onclick="archiveStock('${s.id}')">
                            Archive
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="deleteStock('${s.id}')">
                            Delete
                        </button>
                    </div>

                </div>
            </div>
        `;
    }).join("");

    fill("panel-manage-stocks", html);
}

// =======================================
// ADD STOCK PANEL
// =======================================
function prepareAddStockPanel() {
    const productOptions = PRODUCTS.map(
        p => `<option value="${p.id}">${p.name}</option>`
    ).join("");

    fill("panel-add-stock", `
        <div class="card-clean">
            <h4>Add Stock</h4>

            <label>Product
                <select class="form-select" id="st-prod">${productOptions}</select>
            </label>

            <label class="mt-2">Account Type
                <input type="text" id="st-type" class="form-control">
            </label>

            <label class="mt-2">Duration
                <input type="text" id="st-duration" class="form-control">
            </label>

            <label class="mt-2">Email
                <input type="text" id="st-email" class="form-control">
            </label>

            <label class="mt-2">Password
                <input type="text" id="st-pass" class="form-control">
            </label>

            <label class="mt-2">Profile
                <input type="text" id="st-profile" class="form-control">
            </label>

            <label class="mt-2">PIN
                <input type="text" id="st-pin" class="form-control">
            </label>

            <label class="mt-2">Quantity
                <input type="number" id="st-qty" class="form-control" value="1" min="1">
            </label>

            <label class="mt-2">Auto Archive After (days)
                <input type="number" id="st-archive" class="form-control" value="30">
            </label>

            <label class="mt-2">Premium Until (optional)
                <input type="date" id="st-prem" class="form-control">
            </label>

            <button class="btn btn-primary mt-3" id="st-save">Add Stock</button>
        </div>
    `);

    document.getElementById("st-save").addEventListener("click", saveStockBatch);
}

// =======================================
// SAVE MULTIPLE STOCKS (QUANTITY)
// =======================================
async function saveStockBatch() {
    const product_id = document.getElementById("st-prod").value;
    const account_type = document.getElementById("st-type").value.trim();
    const duration = document.getElementById("st-duration").value;
    const email = document.getElementById("st-email").value.trim();
    const password = document.getElementById("st-pass").value.trim();
    const profile = document.getElementById("st-profile").value.trim();
    const pin = document.getElementById("st-pin").value.trim();
    const qty = Number(document.getElementById("st-qty").value);
    const archive_after = Number(document.getElementById("st-archive").value);
    const premium_until = document.getElementById("st-prem").value;

    if (!product_id || !account_type || !duration || !email || !password) {
        showToast("Please complete all required fields.", "danger");
        return;
    }

    let success = 0;

    for (let i = 0; i < qty; i++) {
        const stock = {
            id: generateId(),
            product_id,
            account_type,
            duration,
            email,
            password,
            profile,
            pin,
            archive_after,
            premium_until: premium_until || null,
            status: "available",
            created_at: new Date().toISOString()
        };

        const ok = await insertRow("stocks", stock);
        if (ok) success++;
    }

    showToast(`Added ${success} stock item(s)`, "success");

    await loadStocksFromDB();
    renderStockPanel();
    refreshStocksStats();
}

// =======================================
// MARK STOCK AS SOLD → MOVE TO RECORDS
// =======================================
window.markStockSold = async function (stockId) {
    const s = STOCKS.find(x => x.id === stockId);
    if (!s) return;

    if (!confirm("Mark this stock as SOLD?")) return;

    // Update stock status
    await updateRow("stocks", { id: stockId }, { status: "sold" });

    // Add record to records table
    const record = {
        id: generateId(),
        order_id: generateId(),
        buyer: "Manual Sale",
        source: "manual",
        product_id: s.product_id,
        account_type: s.account_type,
        duration: s.duration,
        purchase_date: new Date().toISOString().split("T")[0],
        additional_days: 0,
        email: s.email,
        password: s.password,
        profile: s.profile,
        pin: s.pin,
        price: 0,
        status: "sold",
        created_at: new Date().toISOString()
    };

    await insertRow("records", record);

    showToast("Stock marked as sold!", "success");

    await loadStocksFromDB();
    renderStockPanel();
    refreshStocksStats();
};

// =======================================
// ARCHIVE STOCK
// =======================================
window.archiveStock = async function (id) {
    if (!confirm("Archive this stock?")) return;

    await updateRow("stocks", { id }, { status: "archived" });

    showToast("Stock archived.", "warning");

    await loadStocksFromDB();
    renderStockPanel();
    refreshStocksStats();
};

// =======================================
// DELETE STOCK
// =======================================
window.deleteStock = async function (id) {
    if (!confirm("Delete stock? This cannot be undone.")) return;

    await deleteRow("stocks", { id });

    showToast("Stock deleted.", "danger");

    await loadStocksFromDB();
    renderStockPanel();
    refreshStocksStats();
};
