// admin/js/records.js
// Handles Add / List records (sold accounts)

import { dbSelect, dbInsert } from "./supabase.js";
import { showToast, showLoader, hideLoader, durationMap } from "./utils.js";
import { fetchProducts, fillProductSelect, getProductById } from "./products.js";

let RECORDS_CACHE = [];

// --------- INIT / RENDER PANEL ---------

export async function initRecordsModule() {
  const main = document.getElementById("admin-main");
  if (!main) return;

  main.innerHTML = `
    <section class="admin-section">
      <h2 class="admin-title">Add / Edit Record</h2>
      <p class="admin-subtitle">
        Save sold accounts here (manual sales from Telegram, FB, TikTok, etc.).
      </p>

      <form id="record-form" class="admin-form">
        <div class="admin-form-grid">
          <div class="form-field">
            <label for="record-order-id">Order ID (optional / external)</label>
            <input id="record-order-id" name="order_id" type="text"
                   placeholder="Leave blank if none" />
          </div>

          <div class="form-field">
            <label for="record-buyer">Buyer (name or email)</label>
            <input id="record-buyer" name="buyer" type="text" required />
          </div>

          <div class="form-field">
            <label for="record-source">Source</label>
            <select id="record-source" name="source" required>
              <option value="">Select source</option>
              <option value="website">Website</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="telegram">Telegram</option>
              <option value="tiktok">TikTok</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-field">
            <label for="record-product">Product</label>
            <select id="record-product" name="product_id" required></select>
          </div>

          <div class="form-field">
            <label for="record-account-type">Account type</label>
            <input id="record-account-type" name="account_type" type="text"
                   placeholder="e.g. solo account, shared profile" required />
          </div>

          <div class="form-field">
            <label for="record-duration">Duration code</label>
            <input id="record-duration" name="duration" type="text"
                   placeholder="e.g. 1m, 3m, 7d, 12m w" required />
            <small class="text-muted">
              Allowed codes: 7d, 14d, 1m, 2m, 3m, 4m, 5m, 6m, 8m, 10m, 12m, 24m, nw, 3m w, 6m w, 12m w
            </small>
          </div>

          <div class="form-field">
            <label for="record-purchase-date">Purchase date</label>
            <input id="record-purchase-date" name="purchase_date"
                   type="date" required />
          </div>

          <div class="form-field">
            <label for="record-additional-days">Additional days</label>
            <input id="record-additional-days" name="additional_days"
                   type="number" min="0" value="0" />
          </div>

          <div class="form-field">
            <label for="record-email">Account email (optional)</label>
            <input id="record-email" name="email" type="text" />
          </div>

          <div class="form-field">
            <label for="record-password">Account password (optional)</label>
            <input id="record-password" name="password" type="text" />
          </div>

          <div class="form-field">
            <label for="record-profile">Profile (optional)</label>
            <input id="record-profile" name="profile" type="text" />
          </div>

          <div class="form-field">
            <label for="record-pin">PIN (optional)</label>
            <input id="record-pin" name="pin" type="text" />
          </div>

          <div class="form-field">
            <label for="record-price">Price (₱)</label>
            <input id="record-price" name="price" type="number"
                   min="0" step="0.01" required />
          </div>
        </div>

        <div class="admin-form-actions">
          <button type="submit" class="btn btn-primary">Save Record</button>
        </div>
      </form>
    </section>

    <section class="admin-section mt-4">
      <div class="admin-section-head">
        <h2 class="admin-title">Records List</h2>
        <p class="admin-subtitle">History of sold accounts.</p>
      </div>

      <div class="admin-table-wrapper">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Buyer</th>
              <th>Source</th>
              <th>Product</th>
              <th>Account type</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="records-table-body">
            <tr><td colspan="8" class="text-center text-muted">Loading...</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `;

  // Default purchase date = today
  const today = new Date().toISOString().slice(0, 10);
  document.getElementById("record-purchase-date").value = today;

  // Hook form
  document
    .getElementById("record-form")
    .addEventListener("submit", onSubmitRecord);

  // Fill product select from Supabase products table
  await fillProductSelect(document.getElementById("record-product"));

  // Load existing records list
  await loadRecordsTable();
}

// --------- LOAD & RENDER TABLE ---------

async function loadRecordsTable() {
  const tbody = document.getElementById("records-table-body");
  if (!tbody) return;

  showLoader("Loading records...");

  try {
    const [records, products] = await Promise.all([
      dbSelect("records", "*", (q) =>
        q.order("purchase_date", { ascending: false }).limit(200)
      ),
      fetchProducts()
    ]);

    RECORDS_CACHE = records ?? [];

    if (!RECORDS_CACHE.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted">
            No records yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = RECORDS_CACHE.map((rec) =>
      renderRecordRow(rec, products)
    ).join("");
  } catch (err) {
    console.error("loadRecordsTable error:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-danger">
          Failed to load records.
        </td>
      </tr>
    `;
    showToast("Failed to load records from database.", "danger");
  } finally {
    hideLoader();
  }
}

function renderRecordRow(rec, products) {
  const product =
    products?.find((p) => p.id === rec.product_id) || getProductById(rec.product_id);

  const productName = product ? product.name : rec.product_id || "—";

  const durLabel = durationMap[rec.duration] || rec.duration || "—";

  const detailsLines = [
    rec.email && `Email: ${rec.email}`,
    rec.password && `Password: ${rec.password}`,
    rec.profile && `Profile: ${rec.profile}`,
    rec.pin && `PIN: ${rec.pin}`
  ]
    .filter(Boolean)
    .join("<br>");

  const purchaseDate = rec.purchase_date || "";
  const created = rec.created_at
    ? new Date(rec.created_at).toLocaleString()
    : "";

  return `
    <tr>
      <td>
        ${purchaseDate}
        <br><small class="text-muted">${created}</small>
      </td>
      <td>${escapeHtml(rec.buyer || "")}</td>
      <td>${escapeHtml(rec.source || "")}</td>
      <td>${escapeHtml(productName)}</td>
      <td>${escapeHtml(rec.account_type || "")}</td>
      <td>${escapeHtml(durLabel)}</td>
      <td>₱${Number(rec.price || 0).toFixed(2)}</td>
      <td>
        ${detailsLines || '<span class="text-muted">—</span>'}
      </td>
    </tr>
  `;
}

// --------- SUBMIT HANDLER ---------

async function onSubmitRecord(evt) {
  evt.preventDefault();
  const form = evt.target;

  const payload = {
    // id is varchar in your schema – generate simple unique id
    id: `REC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    order_id: form["order_id"].value.trim() || null,
    buyer: form["buyer"].value.trim(),
    source: form["source"].value,
    product_id: form["product_id"].value,
    account_type: form["account_type"].value.trim(),
    duration: form["duration"].value.trim(),
    purchase_date: form["purchase_date"].value,
    additional_days: Number(form["additional_days"].value || 0),
    email: form["email"].value.trim() || null,
    password: form["password"].value.trim() || null,
    profile: form["profile"].value.trim() || null,
    pin: form["pin"].value.trim() || null,
    price: Number(form["price"].value || 0),
    status: "sold"
  };

  if (!payload.buyer || !payload.product_id || !payload.account_type || !payload.duration || !payload.purchase_date) {
    showToast("Please fill in all required fields.", "warning");
    return;
  }

  showLoader("Saving record...");

  try {
    await dbInsert("records", payload);
    showToast("Record saved to database.", "success");

    form.reset();
    // reset purchase date to today after reset
    form["purchase_date"].value = new Date().toISOString().slice(0, 10);
    form["additional_days"].value = 0;

    await loadRecordsTable();
  } catch (err) {
    console.error("onSubmitRecord error:", err);
    showToast("Failed to save record.", "danger");
  } finally {
    hideLoader();
  }
}

// --------- SMALL HELPER ---------

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}