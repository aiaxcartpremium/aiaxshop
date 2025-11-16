// admin/js/orders.js
// Pending Orders panel + "Mark as Paid" button
// Pag naging paid ang order, si Supabase trigger na bahala mag-assign ng stock + create record.

import { dbSelect, dbUpdate } from "./supabase.js";
import { showToast, formatCurrency } from "./utils.js";

function el(id) {
  return document.getElementById(id);
}

export function initOrdersModule() {
  const panel = el("panel-pending-orders");
  if (!panel) return;

  panel.innerHTML = `
    <div class="card-clean">
      <h3 class="mb-3">Pending / Unpaid Orders</h3>
      <div class="table-responsive">
        <table class="records-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Buyer ID</th>
              <th>Product</th>
              <th>Account Type</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="orders-table-body">
            <!-- rows go here -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadPendingOrders();
}

// Load all orders that are NOT 'paid'
async function loadPendingOrders() {
  const tbody = el("orders-table-body");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8">Loading…</td></tr>`;

  try {
    // 1) get all orders
    const orders = await dbSelect(
      "orders",
      "id, buyer_id, product_id, account_type, duration, price, status"
    );

    // 2) filter in JS (lahat na hindi paid)
    const pending = (orders || []).filter(
      (o) => (o.status || "").toLowerCase() !== "paid"
    );

    if (!pending.length) {
      tbody.innerHTML = `<tr><td colspan="8">No pending orders.</td></tr>`;
      return;
    }

    // 3) get products to display product name
    const products = await dbSelect("products", "id, name");
    const prodMap = {};
    (products || []).forEach((p) => {
      prodMap[p.id] = p.name;
    });

    tbody.innerHTML = "";

    pending.forEach((o) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${o.id}</td>
        <td>${o.buyer_id || "-"}</td>
        <td>${prodMap[o.product_id] || o.product_id}</td>
        <td>${o.account_type || "-"}</td>
        <td>${o.duration || "-"}</td>
        <td>${formatCurrency(o.price)}</td>
        <td>${o.status || "-"}</td>
        <td>
          <button
            class="btn btn-sm btn-success"
            data-act="mark-paid"
            data-id="${o.id}"
          >
            Mark as Paid
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    // click handler for Mark as Paid buttons
    tbody.addEventListener("click", async (e) => {
      const btn = e.target.closest("button[data-act='mark-paid']");
      if (!btn) return;

      const orderId = btn.getAttribute("data-id");
      if (!orderId) return;

      const ok = confirm(
        `Mark order ${orderId} as PAID?\n` +
          "This will trigger auto-assign stock in Supabase."
      );
      if (!ok) return;

      await handleMarkPaid(orderId);
    });
  } catch (err) {
    console.error("[orders] loadPendingOrders error:", err);
    tbody.innerHTML = `<tr><td colspan="8">Error loading orders.</td></tr>`;
  }
}

async function handleMarkPaid(orderId) {
  try {
    // 4) Update order status → 'paid'
    await dbUpdate("orders", { status: "paid" }, { id: orderId });

    // Supabase trigger will run here:
    // fn_assign_stock_on_paid_order()
    // → pick 1 available stock
    // → mark stock as sold
    // → insert into records

    showToast("Order marked as PAID. Stock will be assigned automatically.", "success");

    // reload table
    await loadPendingOrders();

    // refresh top stats if available
    if (window.refreshTopStats) {
      window.refreshTopStats();
    }
  } catch (err) {
    console.error("[orders] handleMarkPaid error:", err);
    showToast("Failed to mark order as paid.", "danger");
  }
              }
