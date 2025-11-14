/* ============================================================
   stocks.js — Stock Management Module (Admin)
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import { showToast, confirmBox, cleanText, formatDate } from "./utils.js";
import { dbSelect, dbInsert, dbUpdate, dbDelete } from "./supabase.js";
import { getProducts } from "./products.js";

// In-memory cache
let STOCKS = [];
let PRODUCTS = [];

/* -------------------------------------------------------------
   Exported for admin.js
------------------------------------------------------------- */

export async function initStocksModule() {
    PRODUCTS = getProducts();
    await loadStocksFromDB();
    renderAddStockForm();
    renderManageStocks();
}

export async function refreshStocksStats() {
    if (!STOCKS.length) await loadStocksFromDB();
    const available = STOCKS.filter((s) => s.status === "available").length;
    const el = document.getElementById("stat-stock");
    if (el) el.textContent = available;
}

/* -------------------------------------------------------------
   Load from Supabase
------------------------------------------------------------- */

async function loadStocksFromDB() {
    const data = await dbSelect("stocks", {
        order: { column: "created_at", asc: false },
    });

    STOCKS = data || [];
}

/* -------------------------------------------------------------
   RENDER: Add Stock Form (panel-add-stock)
------------------------------------------------------------- */

function renderAddStockForm() {
    const panel = document.getElementById("panel-add-stock");
    if (!panel) return;

    if (!PRODUCTS.length) {
        panel.innerHTML = `
            <div class="card-clean">
                <h3>Add Stock</h3>
                <p class="text-muted mb-0">
                    No products found. Please add products first in the <b>Products</b> tab.
                </p>
            </div>
        `;
        return;
    }

    const productOptions = PRODUCTS.map(
        (p) => `<option value="${p.id}">${p.name}</option>`
    ).join("");

    panel.innerHTML = `
        <div class="card-clean">
            <h3>Add Stock</h3>

            <div class="row mt-3">
                <div class="col-md-4">
                    <label class="form-label">Product</label>
                    <select id="st-product" class="form-select">
                        <option value="">Select product</option>
                        ${productOptions}
                    </select>
                </div>

                <div class="col-md-4">
                    <label class="form-label">Account Type</label>
                    <input type="text" id="st-type" class="form-control" placeholder="e.g. solo account, shared profile">
                </div>

                <div class="col-md-4">
                    <label class="form-label">Duration</label>
                    <input type="text" id="st-duration" class="form-control" placeholder="e.g. 7d, 1m, 3m">
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-md-6">
                    <label class="form-label">Email / Username</label>
                    <input type="text" id="st-email" class="form-control">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Password</label>
                    <input type="text" id="st-password" class="form-control">
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-md-4">
                    <label class="form-label">Profile (optional)</label>
                    <input type="text" id="st-profile" class="form-control">
                </div>

                <div class="col-md-4">
                    <label class="form-label">PIN (optional)</label>
                    <input type="text" id="st-pin" class="form-control">
                </div>

                <div class="col-md-4">
                    <label class="form-label">Quantity</label>
                    <input type="number" id="st-qty" class="form-control" value="1" min="1">
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-md-6">
                    <label class="form-label">Auto-Archive After (days)</label>
                    <input type="number" id="st-archive" class="form-control" value="30" min="0">
                </div>

                <div class="col-md-6">
                    <label class="form-label">Premium Until (optional)</label>
                    <input type="date" id="st-premium" class="form-control">
                </div>
            </div>

            <button type="button" class="btn btn-primary mt-3" id="btn-save-stock">
                Save Stock
            </button>
        </div>
    `;

    document
        .getElementById("btn-save-stock")
        .addEventListener("click", saveStockBatch);
}

/* -------------------------------------------------------------
   SAVE: Multiple Stocks (by quantity)
------------------------------------------------------------- */

async function saveStockBatch() {
    const prodEl = document.getElementById("st-product");
    const typeEl = document.getElementById("st-type");
    const durEl = document.getElementById("st-duration");
    const emailEl = document.getElementById("st-email");
    const passEl = document.getElementById("st-password");
    const profEl = document.getElementById("st-profile");
    const pinEl = document.getElementById("st-pin");
    const qtyEl = document.getElementById("st-qty");
    const archEl = document.getElementById("st-archive");
    const premEl = document.getElementById("st-premium");

    if (!prodEl || !typeEl || !durEl || !emailEl || !passEl) return;

    const product_id = prodEl.value;
    const account_type = cleanText(typeEl.value.toLowerCase());
    const duration = cleanText(durEl.value);
    const email = cleanText(emailEl.value);
    const password = cleanText(passEl.value);
    const profile = cleanText(profEl?.value || "");
    const pin = cleanText(pinEl?.value || "");
    const qty = Number(qtyEl?.value || 1);
    const archive_after = Number(archEl?.value || 30);
    const premium_until = premEl?.value || null;

    if (!product_id || !account_type || !duration || !email || !password) {
        showToast("Please complete all required fields.", "warning");
        return;
    }

    if (qty <= 0) {
        showToast("Quantity must be at least 1.", "warning");
        return;
    }

    let successCount = 0;

    for (let i = 0; i < qty; i++) {
        const payload = {
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
            created_at: new Date().toISOString(),
        };

        const inserted = await dbInsert("stocks", payload);
        if (inserted !== null) successCount++;
    }

    if (successCount > 0) {
        showToast(`Added ${successCount} stock item(s).`, "success");
        await loadStocksFromDB();
        renderManageStocks();
        await refreshStocksStats();

        // Clear only some fields (keep product & qty)
        typeEl.value = "";
        durEl.value = "";
        emailEl.value = "";
        passEl.value = "";
        profEl.value = "";
        pinEl.value = "";
        premEl.value = "";
    }
}

/* -------------------------------------------------------------
   RENDER: Manage Stocks (panel-manage-stocks)
------------------------------------------------------------- */

function renderManageStocks() {
    const panel = document.getElementById("panel-manage-stocks");
    if (!panel) return;

    const available = STOCKS.filter((s) => s.status === "available");
    const archived = STOCKS.filter((s) => s.status === "archived");
    const sold = STOCKS.filter((s) => s.status === "sold");

    if (!STOCKS.length) {
        panel.innerHTML = `
            <div class="card-clean">
                <h3>Manage Stocks</h3>
                <p class="mb-0">No stock records yet.</p>
            </div>
        `;
        return;
    }

    const section = (title, list, type) => {
        if (!list.length) return "";

        const items = list
            .map((s) => {
                const prod = PRODUCTS.find((p) => p.id === s.product_id);
                return `
                    <div class="card-clean mb-2">
                        <div class="d-flex justify-content-between">
                            <div>
                                <div><b>${prod?.name || "Unknown Product"}</b></div>
                                <div>${s.account_type} — ${s.duration}</div>
                                <div>Email: ${s.email}</div>
                                <div>Profile: ${s.profile || "-"}</div>
                                <div>Premium until: ${
                                    s.premium_until ? formatDate(s.premium_until) : "-"
                                }</div>
                                <div class="text-muted">
                                    Added: ${formatDate(s.created_at)}
                                </div>
                            </div>
                            <div class="text-end">
                                ${
                                    type === "available"
                                        ? `
                                    <button class="btn btn-success btn-sm mb-1" onclick="window.markStockSold('${s.id}')">
                                        Mark Sold
                                    </button><br>
                                    <button class="btn btn-warning btn-sm mb-1" onclick="window.archiveStock('${s.id}')">
                                        Archive
                                    </button><br>
                                    <button class="btn btn-danger btn-sm" onclick="window.deleteStock('${s.id}')">
                                        Delete
                                    </button>
                                `
                                        : type === "archived"
                                        ? `
                                    <button class="btn btn-success btn-sm mb-1" onclick="window.restoreStock('${s.id}')">
                                        Restore
                                    </button><br>
                                    <button class="btn btn-danger btn-sm" onclick="window.deleteStock('${s.id}')">
                                        Delete
                                    </button>
                                `
                                        : `
                                    <button class="btn btn-danger btn-sm" onclick="window.deleteStock('${s.id}')">
                                        Delete
                                    </button>
                                `
                                }
                            </div>
                        </div>
                    </div>
                `;
            })
            .join("");

        return `
            <h5 class="mt-3">${title}</h5>
            ${items}
        `;
    };

    panel.innerHTML = `
        <h3>Manage Stocks</h3>
        ${section("Available", available, "available")}
        ${section("Archived", archived, "archived")}
        ${section("Sold", sold, "sold")}
    `;
}

/* -------------------------------------------------------------
   ACTIONS: Mark Sold / Archive / Restore / Delete
------------------------------------------------------------- */

window.markStockSold = async function (id) {
    const s = STOCKS.find((x) => x.id === id);
    if (!s) return;

    const ok = await confirmBox("Mark this stock as SOLD? (Will not auto-create record here. Website orders will do that automatically.)");
    if (!ok) return;

    const updated = await dbUpdate("stocks", { id }, { status: "sold" });
    if (updated === null) return;

    showToast("Stock marked as sold.", "success");
    await loadStocksFromDB();
    renderManageStocks();
    await refreshStocksStats();
};

window.archiveStock = async function (id) {
    const s = STOCKS.find((x) => x.id === id);
    if (!s) return;

    const ok = await confirmBox("Archive this stock?");
    if (!ok) return;

    const updated = await dbUpdate("stocks", { id }, { status: "archived" });
    if (updated === null) return;

    showToast("Stock archived.", "warning");
    await loadStocksFromDB();
    renderManageStocks();
    await refreshStocksStats();
};

window.restoreStock = async function (id) {
    const s = STOCKS.find((x) => x.id === id);
    if (!s) return;

    const ok = await confirmBox("Restore this stock to AVAILABLE?");
    if (!ok) return;

    const updated = await dbUpdate("stocks", { id }, { status: "available" });
    if (updated === null) return;

    showToast("Stock restored to available.", "success");
    await loadStocksFromDB();
    renderManageStocks();
    await refreshStocksStats();
};

window.deleteStock = async function (id) {
    const s = STOCKS.find((x) => x.id === id);
    if (!s) return;

    const ok = await confirmBox("Delete this stock permanently?");
    if (!ok) return;

    const deleted = await dbDelete("stocks", { id });
    if (deleted === null) return;

    showToast("Stock deleted.", "error");
    await loadStocksFromDB();
    renderManageStocks();
    await refreshStocksStats();
};