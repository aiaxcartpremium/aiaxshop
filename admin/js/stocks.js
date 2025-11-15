// admin/js/stocks.js
// Handles Add Stock + Manage Stocks panels

import { dbSelect, dbInsert } from "./supabase.js";
import { showToast } from "./utils.js";

// Small helper
function el(id) {
  return document.getElementById(id);
}

//// DEBUG VERSION: PARA LANG MA-PROVE NA NAGLO-LOAD YUNG MODULE

export function initStocksModule() {
  console.log("[stocks] initStocksModule CALLED");

  const addPanel = document.getElementById("panel-add-stock");
  const managePanel = document.getElementById("panel-manage-stocks");

  // Para sure na nakikita natin kung nade-detect yung panels
  console.log("[stocks] addPanel =", addPanel);
  console.log("[stocks] managePanel =", managePanel);

  if (addPanel) {
    addPanel.innerHTML = `
      <div class="card-clean">
        <h3>Stocks test</h3>
        <p>If you see this, <strong>stocks.js is loading correctly</strong>.</p>
      </div>
    `;
  }

  if (managePanel) {
    managePanel.innerHTML = `
      <div class="card-clean">
        <h3>Manage Stocks test</h3>
        <p>If you see this, <strong>stocks.js can also write to this panel</strong>.</p>
      </div>
    `;
  }
}

// ========== DATA LOADERS ==========

// Fill product dropdown in Add Stock form
async function loadProductsForStocks() {
  const select = el("stock-product");
  if (!select) return;

  try {
    const rows = await dbSelect("products", "id, name, category");
    if (!Array.isArray(rows)) return;

    // clear existing options except placeholder
    select.innerHTML = `<option value="">Select product</option>`;

    rows.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.category})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("[stocks] loadProductsForStocks error:", err);
    showToast("Failed to load products for stocks.", "danger");
  }
}

// Load stocks table
async function loadStocksTable() {
  const tbody = el("stocks-table-body");
  if (!tbody) return;

  try {
    const [stocks, products] = await Promise.all([
      dbSelect(
        "stocks",
        "id, product_id, account_type, duration, email, status, premium_until"
      ),
      dbSelect("products", "id, name")
    ]);

    const prodMap = {};
    if (Array.isArray(products)) {
      products.forEach((p) => {
        prodMap[p.id] = p.name;
      });
    }

    tbody.innerHTML = "";

    if (!Array.isArray(stocks) || !stocks.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7;
      td.textContent = "No stocks yet.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    stocks.forEach((s) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = s.id;
      tr.appendChild(tdId);

      const tdProduct = document.createElement("td");
      tdProduct.textContent = prodMap[s.product_id] || s.product_id || "-";
      tr.appendChild(tdProduct);

      const tdType = document.createElement("td");
      tdType.textContent = s.account_type || "-";
      tr.appendChild(tdType);

      const tdDuration = document.createElement("td");
      tdDuration.textContent = s.duration || "-";
      tr.appendChild(tdDuration);

      const tdEmail = document.createElement("td");
      tdEmail.textContent = s.email || "-";
      tr.appendChild(tdEmail);

      const tdStatus = document.createElement("td");
      tdStatus.textContent = s.status || "-";
      tr.appendChild(tdStatus);

      const tdPrem = document.createElement("td");
      tdPrem.textContent = s.premium_until || "-";
      tr.appendChild(tdPrem);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("[stocks] loadStocksTable error:", err);
    showToast("Failed to load stocks list.", "danger");
  }
}

// ========== SAVE HANDLER ==========

async function handleSaveStock() {
  const product_id = el("stock-product")?.value || "";
  const account_type = el("stock-account-type")?.value.trim() || "";
  const duration = el("stock-duration")?.value.trim() || "";
  const email = el("stock-email")?.value.trim() || "";
  const password = el("stock-password")?.value.trim() || "";
  const profile = el("stock-profile")?.value.trim() || "";
  const pin = el("stock-pin")?.value.trim() || "";
  const archive_after = Number(el("stock-archive-after")?.value || 0);
  const premium_until = el("stock-premium-until")?.value || null;
  const status = el("stock-status")?.value || "available";

  if (!product_id) {
    showToast("Please select a product first.", "warning");
    return;
  }

  try {
    await dbInsert("stocks", {
      product_id,
      account_type,
      duration,
      email,
      password,
      profile,
      pin,
      archive_after: Number.isFinite(archive_after) ? archive_after : 0,
      premium_until,
      status
    });

    showToast("Stock saved!", "success");

    // Optionally clear form
    if (el("stock-email")) el("stock-email").value = "";
    if (el("stock-password")) el("stock-password").value = "";
    if (el("stock-profile")) el("stock-profile").value = "";
    if (el("stock-pin")) el("stock-pin").value = "";

    // refresh table if present
    loadStocksTable();
    // refresh top stats if available
    if (window.refreshTopStats) window.refreshTopStats();
  } catch (err) {
    console.error("[stocks] handleSaveStock error:", err);
    showToast("Failed to save stock.", "danger");
  }
}