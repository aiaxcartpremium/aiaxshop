/* ============================================================
   products.js — Products module for Aiaxcart Admin
   - Renders Add/Edit Product form
   - Renders Products List
   - Connects to Supabase "products" table
   ============================================================ */

import { showToast } from "./utils.js";
import { dbSelect, dbInsert, dbUpdate, dbDelete } from "./supabase.js";

// simple duration label map (pwede mo pa dagdagan)
const durationMap = {
  "7d": "7 Days",
  "14d": "14 Days",
  "1m": "1 Month",
  "2m": "2 Months",
  "3m": "3 Months",
  "4m": "4 Months",
  "5m": "5 Months",
  "6m": "6 Months",
  "8m": "8 Months",
  "10m": "10 Months",
  "12m": "12 Months",
  "24m": "24 Months",
  "nw": "No Warranty",
  "3m w": "3 Months Warranty",
  "6m w": "6 Months Warranty",
  "12m w": "12 Months Warranty",
};

let productsCache = [];
let editingProductId = null;

/* -------------------------------------------------------------
   PUBLIC: initProductsModule
------------------------------------------------------------- */

export async function initProductsModule() {
  const addPanel = document.getElementById("panel-add-product");
  const listPanel = document.getElementById("panel-products");
  if (!addPanel || !listPanel) return;

  renderAddProductForm(addPanel);
  renderProductsListShell(listPanel);
  setupFormHandlers();

  await loadProductsAndRender();
}

/* -------------------------------------------------------------
   Rendering: Add/Edit Product Form
------------------------------------------------------------- */

function renderAddProductForm(container) {
  container.innerHTML = `
    <div class="card-clean mb-3">
      <h3 class="mb-3" id="productFormTitle">Add New Product</h3>
      <form id="addProductForm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Product Name</label>
            <input type="text" id="product-name" class="form-control" required />
          </div>
          <div class="col-md-6">
            <label class="form-label">Product ID (key)</label>
            <input type="text" id="product-key" class="form-control" placeholder="e.g. netflix" required />
          </div>

          <div class="col-md-6">
            <label class="form-label">Category</label>
            <select id="product-category" class="form-select" required>
              <option value="">Select Category</option>
              <option value="entertainment">Entertainment</option>
              <option value="streaming">Streaming</option>
              <option value="educational">Educational</option>
              <option value="editing">Editing</option>
              <option value="ai">AI</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Icon (emoji or FA class)</label>
            <input type="text" id="product-icon" class="form-control" placeholder="📺 or fa-brands fa-netflix" />
          </div>

          <div class="col-md-4">
            <label class="form-label">Initial Stock</label>
            <input type="number" id="product-stock" class="form-control" min="0" value="0" />
          </div>
        </div>

        <hr class="my-3" />

        <h5 class="mb-2">Pricing Structure</h5>
        <p class="text-muted small mb-2">
          Account types (e.g. solo, shared) with durations and prices. Pwede kang magdagdag ng multiple account types & durations.
        </p>

        <div id="pricing-container"></div>

        <button type="button" class="btn btn-outline-secondary btn-sm mt-2" id="add-pricing-tier">
          + Add Account Type
        </button>

        <div class="mt-3">
          <button type="submit" class="btn btn-primary" id="productFormSubmitBtn">
            Save Product
          </button>
          <button type="button" class="btn btn-outline-secondary ms-2" id="productFormResetBtn">
            Clear / New
          </button>
        </div>
      </form>
      <div id="add-product-msg" class="mt-3 small"></div>
    </div>
  `;

  // default: isang pricing tier
  addPricingTier();
}

function renderProductsListShell(container) {
  container.innerHTML = `
    <div class="card-clean">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h3 class="mb-0">Products List</h3>
        <button type="button" class="btn btn-sm btn-outline-secondary" id="refreshProductsBtn">
          Refresh
        </button>
      </div>
      <div id="products-list"></div>
    </div>
  `;
}

/* -------------------------------------------------------------
   Pricing Builder helpers
------------------------------------------------------------- */

function addPricingTier(prefill = null) {
  const container = document.getElementById("pricing-container");
  if (!container) return;

  const wrapper = document.createElement("div");
  wrapper.className = "border rounded p-3 mb-2 bg-white";

  const accountTypeVal = prefill?.accountType || "";
  const durationsObj = prefill?.durations || {};

  wrapper.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <div class="flex-grow-1 me-2">
        <label class="form-label mb-1">Account Type</label>
        <input type="text" class="form-control account-type" placeholder="e.g. solo profile" value="${accountTypeVal}" />
      </div>
      <button type="button" class="btn btn-sm btn-outline-danger remove-tier">
        <i class="fa fa-times"></i>
      </button>
    </div>
    <div class="duration-prices"></div>
    <button type="button" class="btn btn-sm btn-outline-secondary mt-2 add-duration">
      + Add Duration
    </button>
  `;

  container.appendChild(wrapper);

  const durationContainer = wrapper.querySelector(".duration-prices");

  // kung may prefill, i-add lahat ng durations
  const entries = Object.entries(durationsObj);
  if (entries.length) {
    entries.forEach(([code, price]) => {
      addDurationRow(durationContainer, code, price);
    });
  } else {
    // default: isang empty row
    addDurationRow(durationContainer);
  }
}

function addDurationRow(parentEl, preDuration = "", prePrice = "") {
  if (!parentEl) return;
  const row = document.createElement("div");
  row.className = "row g-2 align-items-center mb-2 duration-price";

  // build select options
  const options = Object.entries(durationMap)
    .map(([code, label]) => {
      const selected = code === preDuration ? "selected" : "";
      return `<option value="${code}" ${selected}>${label}</option>`;
    })
    .join("");

  row.innerHTML = `
    <div class="col-7 col-md-6">
      <select class="form-select duration-select">
        <option value="">Select duration</option>
        ${options}
      </select>
    </div>
    <div class="col-4 col-md-4">
      <input type="number" class="form-control price-input" placeholder="Price" min="0" value="${prePrice}" />
    </div>
    <div class="col-1 text-end">
      <button type="button" class="btn btn-sm btn-outline-danger remove-duration">
        <i class="fa fa-times"></i>
      </button>
    </div>
  `;

  parentEl.appendChild(row);
}

/* -------------------------------------------------------------
   Handlers (form & pricing buttons)
------------------------------------------------------------- */

function setupFormHandlers() {
  const container = document.getElementById("panel-add-product");
  if (!container) return;

  // pricing actions (event delegation)
  container.addEventListener("click", (e) => {
    const target = e.target.closest("button");
    if (!target) return;

    if (target.id === "add-pricing-tier") {
      addPricingTier();
      return;
    }

    if (target.classList.contains("add-duration")) {
      const tier = target.closest(".border");
      const durationContainer = tier.querySelector(".duration-prices");
      addDurationRow(durationContainer);
      return;
    }

    if (target.classList.contains("remove-duration")) {
      const row = target.closest(".duration-price");
      if (row) row.remove();
      return;
    }

    if (target.classList.contains("remove-tier")) {
      const tier = target.closest(".border");
      if (tier) tier.remove();
      return;
    }
  });

  // form submit
  const form = document.getElementById("addProductForm");
  if (form) {
    form.addEventListener("submit", onProductFormSubmit);
  }

  // reset / new
  const resetBtn = document.getElementById("productFormResetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      clearProductForm();
    });
  }

  // refresh button sa Products List
  const listPanel = document.getElementById("panel-products");
  if (listPanel) {
    listPanel.addEventListener("click", (e) => {
      const btn = e.target.closest("#refreshProductsBtn");
      if (btn) {
        loadProductsAndRender();
      }
    });
  }
}

/* -------------------------------------------------------------
   Load + render list
------------------------------------------------------------- */

async function loadProductsAndRender() {
  try {
    const data = await dbSelect("products", {
      orderBy: { column: "created_at", ascending: false },
    });
    productsCache = data || [];
    renderProductsList();
  } catch (err) {
    console.error("Error loading products:", err);
    showToast("Failed to load products.", "error");
  }
}

function renderProductsList() {
  const listEl = document.getElementById("products-list");
  if (!listEl) return;

  if (!productsCache.length) {
    listEl.innerHTML = `<p class="text-muted mb-0">No products found.</p>`;
    return;
  }

  const html = productsCache
    .map((p) => {
      const pricingText = formatPricingShort(p.pricing);

      return `
        <div class="border rounded p-3 mb-2 bg-white">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <div class="fw-semibold">
                ${p.icon ? `<span class="me-1">${p.icon}</span>` : ""}${p.name}
              </div>
              <div class="small text-muted">
                ID: <code>${p.id}</code> • Category: ${p.category || "-"} • Stock: ${
        p.stock ?? 0
      }
              </div>
              ${
                pricingText
                  ? `<div class="small mt-1"><strong>Pricing:</strong> ${pricingText}</div>`
                  : ""
              }
            </div>
            <div class="text-end">
              <button class="btn btn-sm btn-outline-primary mb-1" data-action="edit-product" data-id="${
                p.id
              }">
                Edit
              </button>
              <button class="btn btn-sm btn-outline-danger" data-action="delete-product" data-id="${
                p.id
              }">
                Delete
              </button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  listEl.innerHTML = html;

  // add click handlers for edit/delete
  listEl.querySelectorAll("[data-action='edit-product']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      loadProductIntoForm(id);
    });
  });

  listEl.querySelectorAll("[data-action='delete-product']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      deleteProduct(id);
    });
  });
}

function formatPricingShort(pricing) {
  if (!pricing || typeof pricing !== "object") return "";
  const parts = [];

  Object.entries(pricing).forEach(([accountType, durations]) => {
    const durParts = Object.entries(durations || {}).map(([code, price]) => {
      const label = durationMap[code] || code;
      return `${label}: ₱${price}`;
    });

    if (durParts.length) {
      parts.push(`${accountType} [${durParts.join(" • ")}]`);
    }
  });

  return parts.join(" | ");
}

/* -------------------------------------------------------------
   Form submit / CRUD
------------------------------------------------------------- */

async function onProductFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("product-name").value.trim();
  const id = document.getElementById("product-key").value.trim();
  const category = document.getElementById("product-category").value;
  const icon = document.getElementById("product-icon").value.trim();
  const stock = Number(document.getElementById("product-stock").value || 0);

  if (!name || !id || !category) {
    showToast("Please fill in product name, ID and category.", "warning");
    return;
  }

  const pricing = collectPricingFromForm();
  if (!pricing || !Object.keys(pricing).length) {
    showToast("Please add at least one pricing tier.", "warning");
    return;
  }

  const payload = {
    id,
    name,
    category,
    icon,
    stock,
    pricing,
    updated_at: new Date().toISOString(),
  };

  try {
    if (editingProductId && editingProductId === id) {
      // update existing
      await dbUpdate("products", { id }, payload);
      showToast("Product updated.", "success");
    } else {
      // insert new
      await dbInsert("products", payload);
      showToast("Product added.", "success");
    }

    editingProductId = null;
    document.getElementById("productFormTitle").textContent = "Add New Product";
    document.getElementById("productFormSubmitBtn").textContent = "Save Product";

    clearProductForm(false); // keep one empty tier
    await loadProductsAndRender();

    // refresh stats kung available yung global function
    if (window.refreshDashboardStats) {
      window.refreshDashboardStats();
    }
  } catch (err) {
    console.error("Error saving product:", err);
    showToast("Failed to save product.", "error");
  }
}

function collectPricingFromForm() {
  const container = document.getElementById("pricing-container");
  if (!container) return {};

  const pricing = {};
  const tiers = container.querySelectorAll(".border");

  tiers.forEach((tier) => {
    const typeInput = tier.querySelector(".account-type");
    const type = (typeInput?.value || "").trim().toLowerCase();
    if (!type) return;

    const durationsObj = {};
    tier.querySelectorAll(".duration-price").forEach((row) => {
      const select = row.querySelector(".duration-select");
      const input = row.querySelector(".price-input");
      const code = (select?.value || "").trim();
      const price = Number(input?.value || 0);
      if (!code || !price) return;
      durationsObj[code] = price;
    });

    if (Object.keys(durationsObj).length) {
      pricing[type] = durationsObj;
    }
  });

  return pricing;
}

/* -------------------------------------------------------------
   Load product into form (Edit)
------------------------------------------------------------- */

function loadProductIntoForm(id) {
  const product = productsCache.find((p) => p.id === id);
  if (!product) return;

  editingProductId = product.id;

  document.getElementById("product-name").value = product.name || "";
  document.getElementById("product-key").value = product.id || "";
  document.getElementById("product-category").value = product.category || "";
  document.getElementById("product-icon").value = product.icon || "";
  document.getElementById("product-stock").value = product.stock ?? 0;

  // reset pricing builder
  const pricingContainer = document.getElementById("pricing-container");
  if (pricingContainer) pricingContainer.innerHTML = "";

  if (product.pricing && typeof product.pricing === "object") {
    Object.entries(product.pricing).forEach(([accountType, durations]) => {
      addPricingTier({ accountType, durations });
    });
  } else {
    addPricingTier();
  }

  document.getElementById("productFormTitle").textContent =
    "Edit Product (ID: " + product.id + ")";
  document.getElementById("productFormSubmitBtn").textContent = "Update Product";

  // switch to Add/Edit tab kung hindi active
  const addBtn = document.querySelector('.sidebar button[data-target="panel-add-product"]');
  if (addBtn) addBtn.click();
}

/* -------------------------------------------------------------
   Delete
------------------------------------------------------------- */

async function deleteProduct(id) {
  if (!id) return;
  const confirmDel = window.confirm("Delete this product? This cannot be undone.");
  if (!confirmDel) return;

  try {
    await dbDelete("products", { id });
    showToast("Product deleted.", "success");
    productsCache = productsCache.filter((p) => p.id !== id);
    renderProductsList();

    if (window.refreshDashboardStats) {
      window.refreshDashboardStats();
    }
  } catch (err) {
    console.error("Error deleting product:", err);
    showToast("Failed to delete product.", "error");
  }
}

/* -------------------------------------------------------------
   Clear form
------------------------------------------------------------- */

function clearProductForm(resetEditing = true) {
  document.getElementById("product-name").value = "";
  document.getElementById("product-key").value = "";
  document.getElementById("product-category").value = "";
  document.getElementById("product-icon").value = "";
  document.getElementById("product-stock").value = "0";

  const pricingContainer = document.getElementById("pricing-container");
  if (pricingContainer) {
    pricingContainer.innerHTML = "";
    addPricingTier();
  }

  if (resetEditing) {
    editingProductId = null;
    document.getElementById("productFormTitle").textContent = "Add New Product";
    document.getElementById("productFormSubmitBtn").textContent = "Save Product";
  }

  const msg = document.getElementById("add-product-msg");
  if (msg) msg.innerHTML = "";
}