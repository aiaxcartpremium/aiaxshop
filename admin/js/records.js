// admin/js/records.js
// Handles Records panel (Add/Edit + table) +
// dynamic dropdowns for Account Type & Duration

import { showToast } from "./utils.js";
import { sb } from "./supabase.js";
import { MASTER_PRODUCTS, durationMap } from "./products.js";

let editingRecordId = null;

// ---- DOM HELPERS ----
function el(id) {
  return document.getElementById(id);
}

// Dropdown elements
let productSelect, typeSelect, durationSelect, priceInput;

// ---- INIT ----
export function initRecordsModule() {
  productSelect = el("record-product");
  typeSelect = el("record-type");
  durationSelect = el("record-duration");
  priceInput = el("record-price");

  if (!productSelect || !typeSelect || !durationSelect) {
    console.warn("[records] Form elements not found, skipping init.");
    return;
  }

  setupDropdownLogic();
  populateProductDropdown();
  loadRecordsTable();

  // expose for Save button
  window.saveEditedRecord = handleSaveRecord;
}

// ---- DROPDOWN LOGIC ----
function setupDropdownLogic() {
  // When product changes → reset type & duration, repopulate types
  productSelect.addEventListener("change", () => {
    const productId = productSelect.value || "";
    populateTypeDropdown(productId);
    clearDurationDropdown();
    priceInput && (priceInput.value = "");
  });

  // When account type changes → reset & repopulate durations
  typeSelect.addEventListener("change", () => {
    const productId = productSelect.value || "";
    const accountType = typeSelect.value || "";
    populateDurationDropdown(productId, accountType);
    priceInput && (priceInput.value = "");
  });

  // When duration changes → auto set price
  durationSelect.addEventListener("change", () => {
    const opt =
      durationSelect.options[durationSelect.selectedIndex] || null;
    if (opt && opt.dataset.price && priceInput) {
      priceInput.value = opt.dataset.price;
    }
  });
}

function populateProductDropdown() {
  productSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select product";
  productSelect.appendChild(placeholder);

  MASTER_PRODUCTS.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} (${p.category})`;
    productSelect.appendChild(opt);
  });
}

function populateTypeDropdown(productId, selectedType = "") {
  typeSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select account type";
  typeSelect.appendChild(placeholder);

  if (!productId) return;

  const product = MASTER_PRODUCTS.find((p) => p.id === productId);
  if (!product || !product.pricing) return;

  Object.keys(product.pricing).forEach((acctType) => {
    const opt = document.createElement("option");
    opt.value = acctType;
    opt.textContent = acctType; // already human-readable (e.g. "solo account")
    if (acctType === selectedType) opt.selected = true;
    typeSelect.appendChild(opt);
  });
}

function clearDurationDropdown() {
  durationSelect.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select duration";
  durationSelect.appendChild(placeholder);
}

function populateDurationDropdown(
  productId,
  accountType,
  selectedDuration = ""
) {
  clearDurationDropdown();
  if (!productId || !accountType) return;

  const product = MASTER_PRODUCTS.find((p) => p.id === productId);
  const pricing =
    product && product.pricing ? product.pricing[accountType] : null;
  if (!pricing) return;

  Object.entries(pricing).forEach(([durKey, price]) => {
    const opt = document.createElement("option");
    const label = durationMap[durKey] || durKey;
    opt.value = durKey;
    opt.dataset.price = price;
    opt.textContent = `${label} – ₱${price}`;
    if (durKey === selectedDuration) opt.selected = true;
    durationSelect.appendChild(opt);
  });
}

// ---- LOAD & RENDER TABLE ----
async function loadRecordsTable() {
  const tbody = el("records-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="13">Loading...</td></tr>`;

  const { data, error } = await sb
    .from("records")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="13">Failed to load records.</td></tr>`;
    showToast("Error loading records", "danger");
    return;
  }

  if (!data || !data.length) {
    tbody.innerHTML = `<tr><td colspan="13">No records yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  data.forEach((rec) => {
    const tr = document.createElement("tr");

    const baseExp = computeBaseExpiry(rec.purchase_date, rec.duration);
    const newExp = computeNewExpiry(baseExp, rec.additional_days);

    tr.innerHTML = `
      <td>${rec.order_id || ""}</td>
      <td>${rec.buyer || ""}</td>
      <td>${rec.source || ""}</td>
      <td>${rec.product_id || ""}</td>
      <td>${rec.account_type || ""}</td>
      <td>${rec.duration || ""}</td>
      <td>${rec.purchase_date || ""}</td>
      <td>${baseExp || ""}</td>
      <td>${rec.additional_days ?? 0}</td>
      <td>${newExp || ""}</td>
      <td>${rec.email || ""}</td>
      <td>₱${rec.price ?? 0}</td>
      <td>
        <button 
          class="btn btn-sm btn-outline-primary" 
          data-action="edit" 
          data-id="${rec.id}">
          Edit
        </button>
      </td>
    `;

    // Attach listener for Edit
    tr.querySelector('[data-action="edit"]').addEventListener("click", () =>
      loadRecordIntoForm(rec)
    );

    tbody.appendChild(tr);
  });
}

// ---- FORM HANDLING ----
function loadRecordIntoForm(rec) {
  editingRecordId = rec.id;

  el("record-orderid").value = rec.order_id || "";
  el("record-buyer").value = rec.buyer || "";
  el("record-source").value = rec.source || "";

  // product / type / duration dropdowns
  productSelect.value = rec.product_id || "";
  populateTypeDropdown(rec.product_id || "", rec.account_type || "");
  populateDurationDropdown(
    rec.product_id || "",
    rec.account_type || "",
    rec.duration || ""
  );

  el("record-purchasedate").value =
    rec.purchase_date ? rec.purchase_date.substring(0, 10) : "";
  el("record-adddays").value = rec.additional_days ?? 0;
  priceInput.value = rec.price ?? 0;

  el("record-email").value = rec.email || "";
  el("record-password").value = rec.password || "";
  el("record-profile").value = rec.profile || "";
  el("record-pin").value = rec.pin || "";

  showToast("Loaded record into form (edit mode).", "info");
}

async function handleSaveRecord() {
  const payload = collectFormPayload();
  if (!payload) return;

  let error;

  if (editingRecordId) {
    const res = await sb
      .from("records")
      .update(payload)
      .eq("id", editingRecordId)
      .select()
      .single();
    error = res.error;
  } else {
    const res = await sb.from("records").insert(payload).select().single();
    error = res.error;
  }

  if (error) {
    console.error(error);
    showToast("Failed to save record", "danger");
    return;
  }

  showToast("Record saved successfully!", "success");
  resetForm();
  loadRecordsTable();
}

function collectFormPayload() {
  const buyer = el("record-buyer").value.trim();
  if (!buyer) {
    showToast("Buyer name/email is required", "warning");
    return null;
  }

  const product_id = productSelect.value || "";
  const account_type = typeSelect.value || "";
  const duration = durationSelect.value || "";

  const payload = {
    order_id: el("record-orderid").value.trim() || null,
    buyer,
    source: el("record-source").value || null,
    product_id: product_id || null,
    account_type: account_type || null,
    duration: duration || null,
    purchase_date: el("record-purchasedate").value || null,
    additional_days: parseInt(el("record-adddays").value || "0", 10) || 0,
    price: Number(priceInput.value || "0") || 0,
    email: el("record-email").value.trim() || null,
    password: el("record-password").value.trim() || null,
    profile: el("record-profile").value.trim() || null,
    pin: el("record-pin").value.trim() || null
  };

  return payload;
}

function resetForm() {
  editingRecordId = null;
  el("record-orderid").value = "";
  el("record-buyer").value = "";
  el("record-source").value = "";
  productSelect.value = "";
  populateTypeDropdown("");
  clearDurationDropdown();
  el("record-purchasedate").value = "";
  el("record-adddays").value = "0";
  priceInput.value = "0";
  el("record-email").value = "";
  el("record-password").value = "";
  el("record-profile").value = "";
  el("record-pin").value = "";
}

// ---- DATE HELPERS FOR EXPIRY ----
function computeBaseExpiry(purchaseDate, durationKey) {
  if (!purchaseDate || !durationKey) return "";
  try {
    const d = new Date(purchaseDate);
    const match = durationKey.match(/^(\d+)([md])\s*(w)?/i); // e.g. 3m, 7d, 3m w
    if (!match) return purchaseDate;

    const num = parseInt(match[1], 10);
    const unit = match[2];

    if (unit === "d") d.setDate(d.getDate() + num);
    else if (unit === "m") d.setMonth(d.getMonth() + num);

    return d.toISOString().substring(0, 10);
  } catch {
    return purchaseDate;
  }
}

function computeNewExpiry(baseExpiry, additionalDays) {
  if (!baseExpiry) return "";
  const add = parseInt(additionalDays || "0", 10);
  if (!add) return baseExpiry;

  try {
    const d = new Date(baseExpiry);
    d.setDate(d.getDate() + add);
    return d.toISOString().substring(0, 10);
  } catch {
    return baseExpiry;
  }
}