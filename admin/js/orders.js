// admin/js/orders.js
import { sb } from "./supabase.js";
import { formatPHDate } from "./utils.js";
import { dbSelect, dbUpdate, dbInsert } from "./supabase.js";

export function initOrdersModule() {
  loadOrders();
  document.getElementById("btnDeliverOrder")?.addEventListener("click", submitDelivery);
  document.getElementById("btnCancelOrder")?.addEventListener("click", cancelOrder);
}

/* ================================
   LOAD ALL ORDERS
================================ */
async function loadOrders() {
  const panel = document.getElementById("orders-table");
  panel.innerHTML = `<div class="text-center py-4 text-muted">Loading orders…</div>`;

  const { data: orders, error } = await sb
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    panel.innerHTML = `<div class="text-danger py-3">Failed to load orders.</div>`;
    return;
  }

  if (!orders.length) {
    panel.innerHTML = `<div class="text-center py-4 text-muted">No orders found.</div>`;
    return;
  }

  let html = `
    <table class="table table-striped table-bordered">
      <thead class="table-dark">
        <tr>
          <th>Order ID</th>
          <th>Date</th>
          <th>Buyer</th>
          <th>Product</th>
          <th>Type</th>
          <th>Duration</th>
          <th>Price</th>
          <th>Status</th>
          <th width="140">Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const o of orders) {
    html += `
      <tr>
        <td>${o.id}</td>
        <td>${formatPHDate(o.created_at)}</td>
        <td>${o.buyer_email}</td>
        <td>${o.product_id}</td>
        <td>${o.account_type}</td>
        <td>${o.duration}</td>
        <td>₱${o.price}</td>
        <td>
          ${o.status === "pending"
            ? `<span class="badge bg-warning">Pending</span>`
            : o.status === "delivered"
            ? `<span class="badge bg-success">Delivered</span>`
            : `<span class="badge bg-secondary">${o.status}</span>`
          }
        </td>
        <td>
          ${
            o.status === "pending"
              ? `
                <button class="btn btn-sm btn-success mb-1" onclick="openDeliverModal(${o.id})">Deliver</button>
                <button class="btn btn-sm btn-danger" onclick="openCancel(${o.id})">Cancel</button>
              `
              : "-"
          }
        </td>
      </tr>
    `;
  }

  html += `</tbody></table>`;
  panel.innerHTML = html;
}

/* ================================
   OPEN DELIVER MODAL
================================ */
window.openDeliverModal = async function (orderId) {
  const { data: o } = await sb.from("orders").select("*").eq("id", orderId).single();
  if (!o) return alert("Order not found.");

  document.getElementById("deliver-order-id").value = o.id;
  document.getElementById("deliver-product").textContent = o.product_id;
  document.getElementById("deliver-type").textContent = o.account_type;
  document.getElementById("deliver-duration").textContent = o.duration;
  document.getElementById("deliver-email").value = "";
  document.getElementById("deliver-pass").value = "";
  document.getElementById("deliver-profile").value = "";
  document.getElementById("deliver-pin").value = "";

  new bootstrap.Modal(document.getElementById("modalDeliverOrder")).show();
};

/* ================================
   SUBMIT DELIVERY
================================ */
async function submitDelivery() {
  const order_id = Number(document.getElementById("deliver-order-id").value);
  const account_email = document.getElementById("deliver-email").value.trim();
  const account_password = document.getElementById("deliver-pass").value.trim();
  const profile = document.getElementById("deliver-profile").value.trim();
  const pin = document.getElementById("deliver-pin").value.trim();

  if (!account_email || !account_password) {
    alert("Email & Password required.");
    return;
  }

  // Get order
  const { data: o } = await sb.from("orders").select("*").eq("id", order_id).single();
  if (!o) return alert("Order not found.");

  // 1) Deduct stock (consume 1)
  await sb
    .from("stocks")
    .update({ status: "used" })
    .gt("quantity", 0)
    .eq("product_id", o.product_id)
    .limit(1);

  // 2) Update order → delivered
  await dbUpdate("orders", { id: order_id }, { status: "delivered" });

  // 3) Insert into records
  const purchaseDate = new Date();
  const expiryDate = calcExpiry(purchaseDate, o.duration);

  await dbInsert("records", {
    order_id,
    buyer: o.buyer_email,
    product_id: o.product_id,
    account_type: o.account_type,
    duration: o.duration,
    price: o.price,
    purchase_date: purchaseDate.toISOString(),
    expiry_date: expiryDate.toISOString(),
    account_email,
    account_password,
    profile,
    pin
  });

  bootstrap.Modal.getInstance(document.getElementById("modalDeliverOrder")).hide();
  alert("Delivered successfully!");

  loadOrders();
  window.refreshTopStats?.();
}

/* ================================
   CANCEL ORDER
================================ */
window.openCancel = function (orderId) {
  document.getElementById("cancel-order-id").value = orderId;
  new bootstrap.Modal(document.getElementById("modalCancelOrder")).show();
};

async function cancelOrder() {
  const orderId = Number(document.getElementById("cancel-order-id").value);

  await dbUpdate("orders", { id: orderId }, { status: "cancelled" });

  bootstrap.Modal.getInstance(document.getElementById("modalCancelOrder")).hide();
  loadOrders();
  window.refreshTopStats?.();
}

/* ================================
   EXPIRY CALCULATOR
================================ */
function calcExpiry(startDate, duration) {
  const date = new Date(startDate);

  if (duration.endsWith("d")) {
    const days = Number(duration.replace("d", ""));
    date.setDate(date.getDate() + days);
  } else if (duration.endsWith("m")) {
    const months = Number(duration.replace("m", ""));
    date.setMonth(date.getMonth() + months);
  } else {
    date.setMonth(date.getMonth() + 1);
  }

  return date;
}