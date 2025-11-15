// admin/js/records.js
// Handles: product dropdown, account type, duration, price, and records list

import { showToast } from "./utils.js";
import { dbSelect, dbInsert, dbUpdate } from "./supabase.js";

// Cache for products loaded from Supabase
const PRODUCTS_CACHE = new Map();

function $(id) {
  return document.getElementById(id);
}

const recordProductSel   = $("record-product");
const recordTypeSel      = $("record-type");
const recordDurationSel  = $("record-duration");
const recordPriceInput   = $("record-price");
const recordsTableBody   = $("records-table-body");

/* =========================
   INIT
   ========================= */
export async function initRecordsModule() {
  try {
    await loadProductsForRecords();
    await loadRecordsTable();
    attachRecordFormListeners();
  } catch (err) {
    console.error("initRecordsModule error:", err);
    showToast("Failed to load records module.", "danger");
  }
}

/* =========================
   LOAD PRODUCTS → DROPDOWN
   ========================= */
async function loadProductsForRecords() {
  const { data, error } = await dbSelect("products", "*", { orderBy: { column: "name", ascending: true } });

  if (error) {
    console.error("loadProductsForRecords error:", error);
    showToast("Failed to load products for records form.", "danger");
    return;
  }

  recordProductSel.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select product";
  recordProductSel.appendChild(placeholder);

  data.forEach((p) => {
    PRODUCTS_CACHE.set(p.id, p); // p.id is the string like 'netflix', 'viu', etc.

    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.category})`;
    recordProductSel.appendChild(opt);
  });
}

/* ======================================
   POPULATE ACCOUNT TYPE & DURATION
   ====================================== */

function clearTypeDropdown(msg = "Select product first") {
  recordTypeSel.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = msg;
  recordTypeSel.appendChild(opt);
}

function clearDurationDropdown(msg = "Select account type first") {
  recordDurationSel.innerHTML = "";
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = msg;
  recordDurationSel.appendChild(opt);
}

function populateTypeDropdown(productId) {
  clearTypeDropdown();
  clearDurationDropdown();
  recordPriceInput.value = 0;

  const product = PRODUCTS_CACHE.get(productId);
  if (!product || !product.pricing) {
    clearTypeDropdown("No account types");
    clearDurationDropdown("No durations");
    return;
  }

  recordTypeSel.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select account type";
  recordTypeSel.appendChild(placeholder);

  const pricing = product.pricing; // JSONB from DB
  Object.keys(pricing).forEach((typeKey) => {
    const opt = document.createElement("option");
    opt.value = typeKey;
    opt.textContent = typeKey;
    recordTypeSel.appendChild(opt);
  });

  clearDurationDropdown();
}

function populateDurationDropdown(productId, accountType) {
  clearDurationDropdown();
  recordPriceInput.value = 0;

  const product = PRODUCTS_CACHE.get(productId);
  if (!product || !product.pricing || !accountType) {
    return;
  }

  const priceMap = product.pricing[accountType]; // { '1m': 160, '2m': 280, ... }
  if (!priceMap) {
    clearDurationDropdown("No durations for this type");
    return;
  }

  recordDurationSel.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select duration";
  recordDurationSel.appendChild(placeholder);

  Object.entries(priceMap).forEach(([durKey, price]) => {
    const opt = document.createElement("option");
    opt.value = durKey;
    opt.textContent = `${durKey} – ₱${price}`;
    recordDurationSel.appendChild(opt);
  });
}

/* =========================
   FORM EVENT LISTENERS
   ========================= */
function attachRecordFormListeners() {
  if (!recordProductSel) return;

  // When product changes → refresh account type options
  recordProductSel.addEventListener("change", () => {
    const pid = recordProductSel.value;
    if (!pid) {
      clearTypeDropdown();
      clearDurationDropdown();
      recordPriceInput.value = 0;
      return;
    }
    populateTypeDropdown(pid);
  });

  // When account type changes → refresh duration options
  recordTypeSel.addEventListener("change", () => {
    const pid = recordProductSel.value;
    const type = recordTypeSel.value;
    if (!pid || !type) {
      clearDurationDropdown();
      recordPriceInput.value = 0;
      return;
    }
    populateDurationDropdown(pid, type);
  });

  // When duration changes → set price input
  recordDurationSel.addEventListener("change", () => {
    const pid = recordProductSel.value;
    const type = recordTypeSel.value;
    const dur = recordDurationSel.value;

    const product = PRODUCTS_CACHE.get(pid);
    if (!product || !product.pricing || !type || !dur) {
      return;
    }

    const price = product.pricing[type]?.[dur];
    if (price != null) {
      recordPriceInput.value = price;
    }
  });
}

/* =========================
   LOAD RECORDS TABLE
   ========================= */
async function loadRecordsTable() {
  const { data, error } = await dbSelect("records", "*", {
    orderBy: { column: "created_at", ascending: false },
  });

  if (error) {
    console.error("loadRecordsTable error:", error);
    showToast("Failed to load records list.", "danger");
    return;
  }

  recordsTableBody.innerHTML = "";

  data.forEach((r) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.order_id || ""}</td>
      <td>${r.buyer || ""}</td>
      <td>${r.source || ""}</td>
      <td>${r.product_id || ""}</td>
      <td>${r.account_type || ""}</td>
      <td>${r.duration || ""}</td>
      <td>${r.purchase_date || ""}</td>
      <td>${r.archive_after || ""}</td>
      <td>${r.additional_days || 0}</td>
      <td>${r.premium_until || ""}</td>
      <td>${r.email || ""}</td>
      <td>₱${r.price ?? 0}</td>
      <td>
        <button class="btn btn-sm btn-outline-secondary" data-id="${r.id}" data-action="edit">Edit</button>
      </td>
    `;

    recordsTableBody.appendChild(tr);
  });

  // TODO: hook up edit buttons if needed
}

// Expose for admin.js (if needed)
window.reloadRecordsTable = loadRecordsTable;