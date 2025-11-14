// ================================
// products.js — PRODUCT MANAGEMENT
// ================================

import {
    fill,
    clear,
    showToast,
    generateId
} from "./utils.js";

import {
    fetchTable,
    insertRow,
    updateRow,
    deleteRow
} from "./supabase.js";

// ================================
// INTERNAL DATA
// ================================
let PRODUCTS = [];

// ================================
// INIT MODULE
// Called by admin.js during startup
// ================================
export async function initProductsModule() {
    await loadProducts();
    renderProductPanel();
    prepareAddProductPanel();
}

// ================================
// REFRESH STATS (Dashboard)
// ================================
export async function refreshProductsStats() {
    document.getElementById("stat-products").textContent = PRODUCTS.length;
}

// ================================
// LOAD PRODUCTS FROM DB
// ================================
export async function loadProducts() {
    PRODUCTS = await fetchTable("products");
}

// ================================
// RENDER: MAIN PRODUCTS PANEL
// ================================
function renderProductPanel() {
    const html = PRODUCTS.map(p => `
        <div class="card-clean mb-3">
            <div class="d-flex justify-content-between">
                <div>
                    <h5>${p.icon || ""} ${p.name}</h5>
                    <div><b>ID:</b> ${p.id}</div>
                    <div><b>Category:</b> ${p.category}</div>
                    <div><b>Stock:</b> ${p.stock}</div>

                    <div class="mt-2">
                        <b>Pricing:</b>
                        ${renderPricing(p.pricing)}
                    </div>
                </div>
                <div class="text-end">
                    <button class="btn btn-warning btn-sm mb-2" onclick="editProduct('${p.id}')">
                        <i class="fa fa-edit"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join("");

    fill("panel-products", html || "<p>No products added yet.</p>");
}

// Helper to format pricing structure nicely
function renderPricing(pricing) {
    if (!pricing || Object.keys(pricing).length === 0) return "<i>No pricing set.</i>";

    return Object.entries(pricing)
        .map(([type, durations]) => `
            <div class="mt-1 ms-3">
                <b>${type}</b>: 
                ${Object.entries(durations)
                    .map(([d, price]) => `${d}: ₱${price}`)
                    .join(", ")}
            </div>
        `)
        .join("");
}

// ================================
// PRODUCT FORM (ADD / EDIT)
// ================================
function prepareAddProductPanel() {
    fill("panel-add-product", `
        <div class="card-clean">
            <h4>Add / Edit Product</h4>

            <label class="mt-3">Product Name
                <input type="text" id="prod-name" class="form-control">
            </label>

            <label class="mt-3">Product ID (unique key)
                <input type="text" id="prod-id" class="form-control">
            </label>

            <label class="mt-3">Category
                <select id="prod-category" class="form-select">
                    <option value="">Select Category</option>
                    <option value="entertainment">Entertainment</option>
                    <option value="streaming">Streaming</option>
                    <option value="educational">Educational</option>
                    <option value="editing">Editing</option>
                    <option value="ai">AI</option>
                </select>
            </label>

            <label class="mt-3">Icon (Emoji or Font Awesome)
                <input type="text" id="prod-icon" class="form-control">
            </label>

            <label class="mt-3">Initial Stock
                <input type="number" id="prod-stock" class="form-control" value="0">
            </label>

            <hr class="my-3">

            <h5>Pricing Structure</h5>

            <div id="pricing-builder"></div>

            <button class="btn btn-secondary btn-sm mt-2" id="btnAddPricingTier">
                + Add Account Type
            </button>

            <hr class="my-4">

            <button class="btn btn-primary" id="btnSaveProduct">Save Product</button>
        </div>
    `);

    document.getElementById("btnAddPricingTier")
        .addEventListener("click", addPricingTier);

    document.getElementById("btnSaveProduct")
        .addEventListener("click", saveProduct);

    // Start with one tier
    addPricingTier();
}

// ================================
// PRICING BUILDER (DYNAMIC UI)
// ================================
function addPricingTier(tierData = null) {
    const container = document.getElementById("pricing-builder");
    const id = "tier-" + generateId();

    const html = `
        <div class="border rounded p-2 mb-3" id="${id}">
            <label>Account Type
                <input type="text" class="form-control acc-type" value="${tierData?.accountType || ""}">
            </label>

            <div class="mt-2" id="${id}-durations">
                ${tierData ? renderExistingDurations(tierData.durations) : ""}
            </div>

            <button class="btn btn-secondary btn-sm mt-2" onclick="addDuration('${id}')">+ Add Duration</button>
            <button class="btn btn-danger btn-sm mt-2 float-end" onclick="removeTier('${id}')">Remove</button>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
}

function renderExistingDurations(durations) {
    return Object.entries(durations)
        .map(([dur, price]) => `
            <div class="d-flex gap-2 mb-2 duration-item">
                <input class="form-control duration-key" value="${dur}">
                <input class="form-control duration-price" type="number" value="${price}">
                <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">×</button>
            </div>
        `)
        .join("");
}

window.addDuration = function (tierId) {
    const container = document.getElementById(`${tierId}-durations`);
    const html = `
        <div class="d-flex gap-2 mb-2 duration-item">
            <input class="form-control duration-key" placeholder="e.g. 1m">
            <input class="form-control duration-price" type="number" placeholder="Price">
            <button class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">×</button>
        </div>
    `;
    container.insertAdjacentHTML("beforeend", html);
};

window.removeTier = function (tierId) {
    document.getElementById(tierId)?.remove();
};

// ================================
// SAVE PRODUCT (ADD OR UPDATE)
// ================================
async function saveProduct() {
    const name = document.getElementById("prod-name").value.trim();
    const id = document.getElementById("prod-id").value.trim();
    const category = document.getElementById("prod-category").value;
    const icon = document.getElementById("prod-icon").value.trim();
    const stock = Number(document.getElementById("prod-stock").value);

    if (!name || !id || !category) {
        showToast("Please fill all required fields.", "danger");
        return;
    }

    // Build pricing structure
    const pricing = {};
    const tiers = document.querySelectorAll("#pricing-builder > div");

    tiers.forEach(tier => {
        const type = tier.querySelector(".acc-type").value.trim();
        if (!type) return;

        const durations = {};
        tier.querySelectorAll(".duration-item").forEach(d => {
            const key = d.querySelector(".duration-key").value.trim();
            const price = Number(d.querySelector(".duration-price").value);
            if (key && !isNaN(price)) durations[key] = price;
        });

        if (Object.keys(durations).length > 0) {
            pricing[type] = durations;
        }
    });

    const product = {
        id,
        name,
        category,
        icon,
        stock,
        pricing
    };

    // Check if product exists (update) or new insert
    const existing = PRODUCTS.find(p => p.id === id);

    let saved;
    if (existing) {
        saved = await updateRow("products", { id }, product);
        showToast("Product updated!", "success");
    } else {
        saved = await insertRow("products", product);
        showToast("Product added!", "success");
    }

    if (!saved) return;

    // Refresh data
    await loadProducts();
    renderProductPanel();
    document.querySelector(`[data-target="panel-products"]`).click();
}

// ================================
// LOAD PRODUCT INTO FORM FOR EDITING
// ================================
window.editProduct = function (productId) {
    const p = PRODUCTS.find(x => x.id === productId);
    if (!p) return;

    // Switch to product form tab
    document.querySelector(`[data-target="panel-add-product"]`).click();

    document.getElementById("prod-name").value = p.name;
    document.getElementById("prod-id").value = p.id;
    document.getElementById("prod-category").value = p.category;
    document.getElementById("prod-icon").value = p.icon;
    document.getElementById("prod-stock").value = p.stock;

    // Clear current pricing builder
    clear("pricing-builder");

    // Rebuild pricing tiers
    Object.entries(p.pricing).forEach(([accType, durations]) => {
        addPricingTier({
            accountType: accType,
            durations
        });
    });

    showToast("Product loaded. Edit then click SAVE.", "info");
};

// ================================
// DELETE PRODUCT
// ================================
window.deleteProduct = async function (productId) {
    if (!confirm(`Delete product "${productId}"?`)) return;

    const ok = await deleteRow("products", { id: productId });
    if (!ok) return;

    showToast("Product deleted.", "success");

    await loadProducts();
    renderProductPanel();
};
