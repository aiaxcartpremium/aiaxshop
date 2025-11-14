/* ============================================================
   products.js — Product Management Module
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import { showToast, confirmBox, cleanText } from "./utils.js";
import { dbSelect, dbInsert, dbUpdate, dbDelete } from "./supabase.js";

// In-memory cache
let PRODUCTS = [];
let currentEditId = null; // null = add mode, not editing

/* -------------------------------------------------------------
   Exports used by admin.js and other modules
------------------------------------------------------------- */

export async function initProductsModule() {
    await loadProductsFromDB();
    renderProductsList();
    renderProductForm();
}

export async function refreshProductsStats() {
    if (!PRODUCTS.length) {
        await loadProductsFromDB();
    }
    const el = document.getElementById("stat-products");
    if (el) el.textContent = PRODUCTS.length;
}

// Optional helper for other modules (stocks, orders, etc.)
export function getProducts() {
    return [...PRODUCTS];
}

/* -------------------------------------------------------------
   Load products from Supabase
------------------------------------------------------------- */

async function loadProductsFromDB() {
    const data = await dbSelect("products", {
        order: { column: "created_at", asc: false },
    });

    PRODUCTS = data || [];
}

/* -------------------------------------------------------------
   RENDER: Products List (panel-products)
------------------------------------------------------------- */

function renderProductsList() {
    const panel = document.getElementById("panel-products");
    if (!panel) return;

    if (!PRODUCTS.length) {
        panel.innerHTML = `
            <div class="card-clean">
                <p class="mb-0">No products yet. Go to <b>Add / Edit Product</b> to create one.</p>
            </div>
        `;
        return;
    }

    const html = PRODUCTS.map((p) => {
        const pricingHtml = renderPricingDisplay(p.pricing);

        return `
            <div class="card-clean mb-3">
                <div class="d-flex justify-content-between">
                    <div>
                        <h5>${p.icon || ""} ${p.name}</h5>
                        <div><b>ID:</b> ${p.id}</div>
                        <div><b>Category:</b> ${p.category}</div>
                        <div><b>Stock:</b> ${p.stock ?? 0}</div>

                        <div class="mt-2">
                            <b>Pricing:</b>
                            ${pricingHtml}
                        </div>
                    </div>
                    <div class="text-end">
                        <button class="btn btn-warning btn-sm mb-2" onclick="window.editProduct('${p.id}')">
                            <i class="fa fa-edit"></i>
                        </button><br>
                        <button class="btn btn-danger btn-sm" onclick="window.deleteProduct('${p.id}')">
                            <i class="fa fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    panel.innerHTML = `
        <h3 class="mb-3">Products</h3>
        ${html}
    `;
}

function renderPricingDisplay(pricing) {
    if (!pricing || typeof pricing !== "object" || !Object.keys(pricing).length) {
        return `<div class="ms-2"><i>No pricing set.</i></div>`;
    }

    return Object.entries(pricing)
        .map(([accountType, durations]) => {
            const dStr = Object.entries(durations || {})
                .map(([durKey, price]) => `${durKey}: ₱${price}`)
                .join(", ");

            return `
                <div class="ms-3 mt-1">
                    <b>${accountType}</b>: ${dStr || "<i>No durations</i>"}
                </div>
            `;
        })
        .join("");
}

/* -------------------------------------------------------------
   RENDER: Product Form (panel-add-product)
------------------------------------------------------------- */

function renderProductForm() {
    const panel = document.getElementById("panel-add-product");
    if (!panel) return;

    panel.innerHTML = `
        <div class="card-clean">
            <h3 id="product-form-title">Add / Edit Product</h3>

            <div class="row mt-3">
                <div class="col-md-6">
                    <label class="form-label">Product Name</label>
                    <input type="text" id="prod-name" class="form-control" placeholder="e.g. Netflix Premium">
                </div>
                <div class="col-md-6">
                    <label class="form-label">Product ID (key, must be unique)</label>
                    <input type="text" id="prod-id" class="form-control" placeholder="e.g. netflix">
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-md-4">
                    <label class="form-label">Category</label>
                    <select id="prod-category" class="form-select">
                        <option value="">Select category</option>
                        <option value="entertainment">Entertainment</option>
                        <option value="streaming">Streaming</option>
                        <option value="educational">Educational</option>
                        <option value="editing">Editing</option>
                        <option value="ai">AI</option>
                    </select>
                </div>
                <div class="col-md-4">
                    <label class="form-label">Icon (emoji or FA class)</label>
                    <input type="text" id="prod-icon" class="form-control" placeholder="e.g. 📺 or fa-brands fa-netflix">
                </div>
                <div class="col-md-4">
                    <label class="form-label">Initial Stock</label>
                    <input type="number" id="prod-stock" class="form-control" min="0" value="0">
                </div>
            </div>

            <hr class="my-4">

            <h5>Pricing Structure</h5>
            <p class="text-muted mb-2">
                Group your prices by <b>Account Type</b> (e.g. solo account, shared profile), then assign durations (e.g. 1m, 3m, 7d) and prices.
            </p>

            <div id="pricing-builder"></div>

            <button type="button" class="btn btn-secondary btn-sm mt-2" id="btn-add-tier">
                + Add Account Type
            </button>

            <hr class="my-4">

            <button type="button" class="btn btn-primary" id="btn-save-product">
                Save Product
            </button>
            <button type="button" class="btn btn-outline-secondary ms-2" id="btn-reset-product">
                Clear Form
            </button>
        </div>
    `;

    // Attach events
    document.getElementById("btn-add-tier").addEventListener("click", () => addPricingTier());
    document.getElementById("btn-save-product").addEventListener("click", saveProduct);
    document.getElementById("btn-reset-product").addEventListener("click", () => resetProductForm());

    // Start with one empty tier
    resetProductForm();
}

/* -------------------------------------------------------------
   PRICING BUILDER LOGIC
------------------------------------------------------------- */

function addPricingTier(existing = null) {
    const container = document.getElementById("pricing-builder");
    if (!container) return;

    const tierId = "tier-" + Math.random().toString(36).substring(2, 9);

    const html = `
        <div class="border rounded p-2 mb-3 pricing-tier" id="${tierId}">
            <div class="d-flex justify-content-between align-items-center">
                <div class="flex-grow-1 me-2">
                    <label class="form-label mb-1">Account Type</label>
                    <input type="text" class="form-control account-type-input" placeholder="e.g. solo account, shared profile">
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger mt-3 remove-tier-btn">
                    Remove
                </button>
            </div>

            <div class="mt-3">
                <label class="form-label mb-1">Durations & Prices</label>
                <div class="duration-wrapper"></div>

                <button type="button" class="btn btn-sm btn-outline-secondary mt-2 add-duration-btn">
                    + Add Duration
                </button>
            </div>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", html);

    const tierEl = document.getElementById(tierId);
    const accInput = tierEl.querySelector(".account-type-input");
    const durationWrapper = tierEl.querySelector(".duration-wrapper");
    const addDurationBtn = tierEl.querySelector(".add-duration-btn");
    const removeTierBtn = tierEl.querySelector(".remove-tier-btn");

    // If editing existing tier
    if (existing) {
        accInput.value = existing.accountType;
        Object.entries(existing.durations || {}).forEach(([durKey, price]) => {
            addDurationRow(durationWrapper, durKey, price);
        });
    } else {
        // default single empty row
        addDurationRow(durationWrapper);
    }

    addDurationBtn.addEventListener("click", () => addDurationRow(durationWrapper));
    removeTierBtn.addEventListener("click", () => tierEl.remove());
}

function addDurationRow(wrapper, durationKey = "", priceValue = "") {
    const row = document.createElement("div");
    row.className = "d-flex gap-2 mb-2 duration-row";

    row.innerHTML = `
        <input type="text" class="form-control duration-key" placeholder="e.g. 7d, 1m, 3m" value="${durationKey}">
        <input type="number" class="form-control duration-price" placeholder="Price" value="${priceValue}">
        <button type="button" class="btn btn-sm btn-outline-danger">&times;</button>
    `;

    const removeBtn = row.querySelector("button");
    removeBtn.addEventListener("click", () => row.remove());

    wrapper.appendChild(row);
}

/* -------------------------------------------------------------
   FORM HELPERS
------------------------------------------------------------- */

function resetProductForm() {
    currentEditId = null;

    const titleEl = document.getElementById("product-form-title");
    if (titleEl) titleEl.textContent = "Add / Edit Product";

    const idInput = document.getElementById("prod-id");
    if (idInput) {
        idInput.value = "";
        idInput.disabled = false;
    }

    const nameInput = document.getElementById("prod-name");
    const catInput = document.getElementById("prod-category");
    const iconInput = document.getElementById("prod-icon");
    const stockInput = document.getElementById("prod-stock");

    if (nameInput) nameInput.value = "";
    if (catInput) catInput.value = "";
    if (iconInput) iconInput.value = "";
    if (stockInput) stockInput.value = 0;

    const pricingContainer = document.getElementById("pricing-builder");
    if (pricingContainer) {
        pricingContainer.innerHTML = "";
        addPricingTier(); // start with one empty tier
    }

    const saveBtn = document.getElementById("btn-save-product");
    if (saveBtn) saveBtn.textContent = "Save Product";
}

/* -------------------------------------------------------------
   SAVE PRODUCT (Add or Update)
------------------------------------------------------------- */

async function saveProduct() {
    const nameEl = document.getElementById("prod-name");
    const idEl = document.getElementById("prod-id");
    const catEl = document.getElementById("prod-category");
    const iconEl = document.getElementById("prod-icon");
    const stockEl = document.getElementById("prod-stock");
    const pricingContainer = document.getElementById("pricing-builder");

    if (!nameEl || !idEl || !catEl || !iconEl || !stockEl || !pricingContainer) return;

    const name = cleanText(nameEl.value);
    const id = cleanText(idEl.value).toLowerCase();
    const category = catEl.value;
    const icon = iconEl.value.trim();
    const stock = Number(stockEl.value || 0);

    if (!name || !id || !category) {
        showToast("Please fill in product name, ID, and category.", "warning");
        return;
    }

    // Build pricing object
    const pricing = {};

    pricingContainer.querySelectorAll(".pricing-tier").forEach((tierEl) => {
        const accInput = tierEl.querySelector(".account-type-input");
        if (!accInput) return;

        const accountType = cleanText(accInput.value.toLowerCase());
        if (!accountType) return;

        const durations = {};
        tierEl.querySelectorAll(".duration-row").forEach((row) => {
            const keyEl = row.querySelector(".duration-key");
            const priceEl = row.querySelector(".duration-price");
            if (!keyEl || !priceEl) return;

            const dKey = cleanText(keyEl.value);
            const dPrice = Number(priceEl.value);

            if (dKey && !isNaN(dPrice)) {
                durations[dKey] = dPrice;
            }
        });

        if (Object.keys(durations).length) {
            pricing[accountType] = durations;
        }
    });

    const payload = {
        id,
        name,
        category,
        icon,
        stock,
        pricing, // JSONB in Supabase
    };

    let success = false;

    // Editing existing product
    if (currentEditId) {
        const matchId = currentEditId; // keep original PK
        const updated = await dbUpdate("products", { id: matchId }, {
            name,
            category,
            icon,
            stock,
            pricing,
        });

        if (updated !== null) {
            showToast("Product updated.", "success");
            success = true;
        }
    } else {
        // Check if ID already exists
        const exists = PRODUCTS.some((p) => p.id === id);
        if (exists) {
            showToast("This Product ID is already used. Choose another.", "error");
            return;
        }

        const inserted = await dbInsert("products", payload);
        if (inserted !== null) {
            showToast("Product added.", "success");
            success = true;
        }
    }

    if (!success) return;

    await loadProductsFromDB();
    renderProductsList();
    resetProductForm();
}

/* -------------------------------------------------------------
   EDIT & DELETE (attached to window for HTML onclick)
------------------------------------------------------------- */

window.editProduct = function (productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    currentEditId = product.id;

    const titleEl = document.getElementById("product-form-title");
    if (titleEl) titleEl.textContent = `Editing: ${product.name}`;

    const idInput = document.getElementById("prod-id");
    const nameInput = document.getElementById("prod-name");
    const catInput = document.getElementById("prod-category");
    const iconInput = document.getElementById("prod-icon");
    const stockInput = document.getElementById("prod-stock");

    if (idInput) {
        idInput.value = product.id;
        idInput.disabled = true; // don't allow changing primary ID
    }
    if (nameInput) nameInput.value = product.name;
    if (catInput) catInput.value = product.category;
    if (iconInput) iconInput.value = product.icon || "";
    if (stockInput) stockInput.value = product.stock ?? 0;

    const pricingContainer = document.getElementById("pricing-builder");
    if (pricingContainer) {
        pricingContainer.innerHTML = "";

        if (product.pricing && typeof product.pricing === "object") {
            Object.entries(product.pricing).forEach(([accountType, durations]) => {
                addPricingTier({
                    accountType,
                    durations,
                });
            });
        } else {
            addPricingTier();
        }
    }

    const saveBtn = document.getElementById("btn-save-product");
    if (saveBtn) saveBtn.textContent = "Update Product";

    // switch tab to Add/Edit Product
    const btn = document.querySelector('.sidebar button[data-target="panel-add-product"]');
    if (btn) btn.click();

    showToast("Product loaded into form. Make changes and click Update.", "info");
};

window.deleteProduct = async function (productId) {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product) return;

    const ok = await confirmBox(`Delete product "${product.name}" (${product.id})?`);
    if (!ok) return;

    const deleted = await dbDelete("products", { id: productId });
    if (deleted === null) return;

    showToast("Product deleted.", "success");

    await loadProductsFromDB();
    renderProductsList();
    await refreshProductsStats();
};