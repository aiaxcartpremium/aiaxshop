// =============================
// STOCKS MODULE
// =============================
import { sb, dbSelect, dbInsert, dbUpdate, dbDelete } from "./supabase.js";

// Dropdown refs
const ddProduct = document.getElementById("stock-product");
const ddType = document.getElementById("stock-type");
const ddDuration = document.getElementById("stock-duration");

// Table container
const stocksTable = document.getElementById("stocks-table");

// Modal inputs
const addQty = document.getElementById("stock-quantity");
const addExpiry = document.getElementById("stock-expiry");
const addArchive = document.getElementById("stock-archivedays");

const btnSaveStock = document.getElementById("btnSaveStock");

// EDIT modal refs
const editId = document.getElementById("edit-stock-id");
const editQty = document.getElementById("edit-stock-quantity");
const editExpiry = document.getElementById("edit-stock-expiry");
const editArchive = document.getElementById("edit-stock-archive");

const btnUpdateStock = document.getElementById("btnUpdateStock");
const btnDeleteStock = document.getElementById("btnDeleteStock");
const btnArchiveStock = document.getElementById("btnArchiveStock");

// ==========================================
// INIT — Load dropdowns + table
// ==========================================
export function initStocksModule() {
  loadDropdowns();
  loadStocks();

  btnSaveStock.addEventListener("click", saveStock);
  btnUpdateStock.addEventListener("click", updateStock);
  btnDeleteStock.addEventListener("click", deleteStock);
  btnArchiveStock.addEventListener("click", archiveStock);
}

// ==========================================
// LOAD DROPDOWNS (product, type, duration)
// ==========================================
async function loadDropdowns() {
  // Load products
  const products = await dbSelect("products", "*");
  ddProduct.innerHTML =
    `<option value="">Select product</option>` +
    products
      .map(
        (p) =>
          `<option value="${p.product_id}">${p.name} (${p.category})</option>`
      )
      .join("");

  // Load account types
  const types = await dbSelect("account_types", "*");
  ddType.innerHTML =
    `<option value="">Select account type</option>` +
    types.map((t) => `<option value="${t.account_type}">${t.account_type}</option>`).join("");

  // Load durations
  const durations = await dbSelect("durations", "*");
  ddDuration.innerHTML =
    `<option value="">Select duration</option>` +
    durations
      .map((d) => `<option value="${d.duration_code}">${d.duration_code}</option>`)
      .join("");
}

// ==========================================
// LOAD STOCK TABLE
// ==========================================
async function loadStocks() {
  stocksTable.innerHTML =
    `<div class="text-center text-muted py-4">Loading stock records…</div>`;

  const stocks = await dbSelect("stocks", "*");

  if (!stocks.length) {
    stocksTable.innerHTML =
      `<div class="text-center text-muted py-4">No stock entries yet.</div>`;
    return;
  }

  let html = `
    <table class="table table-striped">
      <thead>
        <tr>
          <th>ID</th>
          <th>Product</th>
          <th>Type</th>
          <th>Duration</th>
          <th>Qty</th>
          <th>Expiry</th>
          <th>Archive In</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const s of stocks) {
    html += `
      <tr>
        <td>${s.id}</td>
        <td>${s.product_id}</td>
        <td>${s.account_type}</td>
        <td>${s.duration}</td>
        <td>${s.quantity}</td>
        <td>${s.expiry_date || "-"}</td>
        <td>${s.archive_after || "-"}</td>

        <td>
          <button class="btn btn-sm btn-primary" onclick="openStockEdit('${s.id}')">
            Edit
          </button>
        </td>
      </tr>`;
  }

  html += `</tbody></table>`;
  stocksTable.innerHTML = html;
}

// ==========================================
// ADD STOCK
// ==========================================
async function saveStock() {
  const product_id = ddProduct.value;
  const account_type = ddType.value;
  const duration = ddDuration.value;
  const quantity = Number(addQty.value);
  const expiry_date = addExpiry.value || null;
  const archive_after = Number(addArchive.value) || null;

  if (!product_id || !account_type || !duration || !quantity) {
    alert("Please complete all fields.");
    return;
  }

  await dbInsert("stocks", [
    {
      product_id,
      account_type,
      duration,
      quantity,
      expiry_date,
      archive_after,
      created_at: new Date().toISOString(),
      status: "available",
    },
  ]);

  alert("Stock added!");

  // reset form
  addQty.value = "";
  addExpiry.value = "";
  addArchive.value = "";

  loadStocks();
}

// ==========================================
// OPEN EDIT STOCK MODAL
// ==========================================
window.openStockEdit = async function (stockId) {
  const row = (
    await sb.from("stocks").select("*").eq("id", stockId).single()
  ).data;

  editId.value = row.id;
  editQty.value = row.quantity;
  editExpiry.value = row.expiry_date || "";
  editArchive.value = row.archive_after || "";

  new bootstrap.Modal(document.getElementById("modalEditStock")).show();
};

// ==========================================
// UPDATE STOCK
// ==========================================
async function updateStock() {
  const id = editId.value;

  await dbUpdate(
    "stocks",
    { id },
    {
      quantity: Number(editQty.value),
      expiry_date: editExpiry.value || null,
      archive_after: Number(editArchive.value) || null,
    }
  );

  alert("Stock updated!");
  loadStocks();
}

// ==========================================
// ARCHIVE STOCK
// ==========================================
async function archiveStock() {
  const id = editId.value;

  await dbUpdate(
    "stocks",
    { id },
    {
      status: "archived",
      quantity: 0,
      updated_at: new Date().toISOString(),
    }
  );

  alert("Stock archived!");
  loadStocks();
}

// ==========================================
// DELETE STOCK
// ==========================================
async function deleteStock() {
  const id = editId.value;

  if (!confirm("Delete this stock?")) return;

  await dbDelete("stocks", { id });

  alert("Stock deleted!");
  loadStocks();
}