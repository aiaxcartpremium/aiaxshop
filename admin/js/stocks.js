// admin/js/stocks.js
// Handles: Add Stock + Manage Stocks panels

import { showToast } from "./utils.js";
import { dbSelect, dbInsert, dbUpdate } from "./supabase.js";

function $(id) {
  return document.getElementById(id);
}

const addStockPanel    = $("panel-add-stock");
const manageStockPanel = $("panel-manage-stocks");

// cache for products (id → object)
const PRODUCTS_CACHE = new Map();

/* =========================
   INIT
   ========================= */

export async function initStocksModule() {
  try {
    renderAddStockPanel();
    renderManageStockPanel();

    await loadProductsForStockForm();
    await loadStocksTable();

    attachAddStockHandler();
  } catch (err) {
    console.error("initStocksModule error:", err);
    showToast("Failed to load Stocks module.", "danger");
  }
}

/* =========================
   RENDER PANELS
   ========================= */

function renderAddStockPanel() {
  if (!addStockPanel) return;

  addStockPanel.innerHTML = `
    <div class="card-clean mb-3">
      <h3 class="mb-3">Add Stock</h3>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Product</label>
          <select id="stock-product" class="form-select">
            <option value="">Loading products...</option>
          </select>
        </div>
        <div class="col-md-4">
          <label class="form-label">Account Type</label>
          <input
            type="text"
            id="stock-account-type"
            class="form-control"
            placeholder="e.g. solo account, shared profile"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label">Duration</label>
          <input
            type="text"
            id="stock-duration"
            class="form-control"
            placeholder="e.g. 1m, 3m, 7d"
          />
        </div>

        <div class="col-md-3">
          <label class="form-label">Account Email</label>
          <input type="text" id="stock-email" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Password</label>
          <input type="text" id="stock-password" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Profile</label>
          <input type="text" id="stock-profile" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label">PIN</label>
          <input type="text" id="stock-pin" class="form-control" />
        </div>

        <div class="col-md-4">
          <label class="form-label">Status</label>
          <select id="stock-status" class="form-select">
            <option value="available">available</option>
            <option value="reserved">reserved</option>
            <option value="sold">sold</option>
            <option value="archived">archived</option>
          </select>
        </div>
      </div>

      <button
        class="btn btn-primary mt-3"
        type="button"
        id="btn-save-stock"
      >
        Save Stock
      </button>
    </div>
  `;
}

function renderManageStockPanel() {
  if (!manageStockPanel) return;

  manageStockPanel.innerHTML = `
    <div class="card-clean">
      <h3 class="mb-3">Manage Stocks</h3>
      <div class="table-responsive">
        <table class="records-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Account Type</th>
              <th>Duration</th>
              <th>Email</th>
              <th>Profile</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="stocks-table-body"></tbody>
        </table>
      </div>
    </div>
  `;
}

/* =========================
   LOAD PRODUCTS FOR ADD STOCK FORM
   ========================= */

async function loadProductsForStockForm() {
  const selectEl = $("stock-product");
  if (!selectEl) return;

  const { data, error } = await dbSelect("products", "*", {
    orderBy: { column: "name", ascending: true },
  });

  if (error) {
    console.error("loadProductsForStockForm error:", error);
    showToast("Failed to load products for stock form.", "danger");
    selectEl.innerHTML =
      '<option value="">Cannot load products</option>';
    return;
  }

  selectEl.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select product";
  selectEl.appendChild(placeholder);

  data.forEach((p) => {
    PRODUCTS_CACHE.set(p.id, p); // cache by id (netflix, viu, etc.)

    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.category})`;
    selectEl.appendChild(opt);
  });
}

/* =========================
   ADD STOCK HANDLER
   ========================= */

function attachAddStockHandler() {
  const btn = $("btn-save-stock");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    try {
      const product_id   = $("stock-product").value.trim();
      const account_type = $("stock-account-type").value.trim();
      const duration     = $("stock-duration").value.trim();
      const email        = $("stock-email").value.trim();
      const password     = $("stock-password").value.trim();
      const profile      = $("stock-profile").value.trim();
      const pin          = $("stock-pin").value.trim();
      const status       = $("stock-status").value || "available";

      if (!product_id) {
        showToast("Please select a product.", "warning");
        return;
      }

      if (!account_type || !duration) {
        showToast("Please fill account type and duration.", "warning");
        return;
      }

      const payload = {
        product_id,
        account_type,
        duration,
        email,
        password,
        profile,
        pin,
        status,
      };

      const { error } = await dbInsert("stocks", payload);

      if (error) {
        console.error("dbInsert stocks error:", error);
        showToast("Failed to save stock.", "danger");
        return;
      }

      showToast("Stock saved.", "success");
      clearAddStockForm();
      await loadStocksTable();
    } catch (err) {
      console.error("attachAddStockHandler error:", err);
      showToast("Unexpected error saving stock.", "danger");
    }
  });
}

function clearAddStockForm() {
  if ($("stock-product")) $("stock-product").value = "";
  if ($("stock-account-type")) $("stock-account-type").value = "";
  if ($("stock-duration")) $("stock-duration").value = "";
  if ($("stock-email")) $("stock-email").value = "";
  if ($("stock-password")) $("stock-password").value = "";
  if ($("stock-profile")) $("stock-profile").value = "";
  if ($("stock-pin")) $("stock-pin").value = "";
  if ($("stock-status")) $("stock-status").value = "available";
}

/* =========================
   LOAD / MANAGE STOCKS TABLE
   ========================= */

async function loadStocksTable() {
  const tbody = $("stocks-table-body");
  if (!tbody) return;

  const { data, error } = await dbSelect("stocks", "*", {
    orderBy: { column: "created_at", ascending: false },
  });

  if (error) {
    console.error("loadStocksTable error:", error);
    showToast("Failed to load stocks list.", "danger");
    return;
  }

  tbody.innerHTML = "";

  data.forEach((s) => {
    const tr = document.createElement("tr");

    const prod = PRODUCTS_CACHE.get(s.product_id);
    const prodLabel = prod ? prod.name : s.product_id;

    tr.innerHTML = `
      <td>${s.id || ""}</td>
      <td>${prodLabel || ""}</td>
      <td>${s.account_type || ""}</td>
      <td>${s.duration || ""}</td>
      <td>${s.email || ""}</td>
      <td>${s.profile || ""}</td>
      <td>${s.status || ""}</td>
      <td>${s.created_at ? new Date(s.created_at).toLocaleString() : ""}</td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-success" data-action="set-status" data-id="${s.id}" data-status="available">Avail</button>
          <button class="btn btn-outline-warning" data-action="set-status" data-id="${s.id}" data-status="sold">Sold</button>
          <button class="btn btn-outline-secondary" data-action="set-status" data-id="${s.id}" data-status="archived">Archive</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // attach status change handlers
  tbody.querySelectorAll("button[data-action='set-status']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const status = btn.getAttribute("data-status");
      await updateStockStatus(id, status);
    });
  });
}

async function updateStockStatus(id, status) {
  try {
    if (!id) return;
    const { error } = await dbUpdate("stocks", { status }, { eq: { id } });

    if (error) {
      console.error("updateStockStatus error:", error);
      showToast("Failed to update stock status.", "danger");
      return;
    }

    showToast("Stock status updated.", "success");
    await loadStocksTable();
  } catch (err) {
    console.error("updateStockStatus unexpected error:", err);
    showToast("Unexpected error updating stock.", "danger");
  }
}

// optional global refresh hook
window.reloadStocksTable = loadStocksTable;