// admin/js/orders.js
// Pending orders + auto-assign stock → records

import { dbSelect, dbUpdate, dbInsert } from "./supabase.js";
import { showToast } from "./utils.js";

function el(id) {
  return document.getElementById(id);
}

export function initOrdersModule() {
  const panel = el("panel-pending-orders");
  if (!panel) return;

  panel.innerHTML = `
    <div class="card-clean">
      <h3 class="mb-3">Pending Orders</h3>
      <div class="table-responsive">
        <table class="records-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Buyer ID</th>
              <th>Product</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Price</th>
              <th>Status</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="pending-orders-body">
            <!-- rows go here -->
          </tbody>
        </table>
      </div>
    </div>
  `;

  loadPendingOrders();
}

// ========== LOAD PENDING ORDERS ==========

async function loadPendingOrders() {
  const tbody = el("pending-orders-body");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9">Loading...</td></tr>`;

  try {
    const [orders, products] = await Promise.all([
      dbSelect(
        "orders",
        "id,buyer_id,product_id,account_type,duration,price,status,created_at"
      ),
      dbSelect("products", "id,name")
    ]);

    const prodMap = {};
    (products || []).forEach((p) => {
      prodMap[p.id] = p.name;
    });

    const pending = (orders || []).filter(
      (o) => (o.status || "").toLowerCase() === "pending"
    );

    tbody.innerHTML = "";

    if (!pending.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 9;
      td.textContent = "No pending orders.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    pending.forEach((o) => {
      const tr = document.createElement("tr");

      const tdId = document.createElement("td");
      tdId.textContent = o.id;
      tr.appendChild(tdId);

      const tdBuyer = document.createElement("td");
      tdBuyer.textContent = o.buyer_id || "-";
      tr.appendChild(tdBuyer);

      const tdProd = document.createElement("td");
      tdProd.textContent = prodMap[o.product_id] || o.product_id || "-";
      tr.appendChild(tdProd);

      const tdType = document.createElement("td");
      tdType.textContent = o.account_type || "-";
      tr.appendChild(tdType);

      const tdDur = document.createElement("td");
      tdDur.textContent = o.duration || "-";
      tr.appendChild(tdDur);

      const tdPrice = document.createElement("td");
      tdPrice.textContent =
        typeof o.price === "number" ? `₱${o.price}` : o.price || "-";
      tr.appendChild(tdPrice);

      const tdStatus = document.createElement("td");
      tdStatus.textContent = o.status || "-";
      tr.appendChild(tdStatus);

      const tdCreated = document.createElement("td");
      tdCreated.textContent = o.created_at
        ? new Date(o.created_at).toLocaleString("en-PH", {
            dateStyle: "short",
            timeStyle: "short"
          })
        : "-";
      tr.appendChild(tdCreated);

      const tdAction = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = "btn btn-sm btn-primary";
      btn.textContent = "Auto-assign & deliver";
      btn.addEventListener("click", () => handleAutoFulfill(o.id));
      tdAction.appendChild(btn);
      tr.appendChild(tdAction);

      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("[orders] loadPendingOrders error:", err);
    tbody.innerHTML = `<tr><td colspan="9">Failed to load orders.</td></tr>`;
    showToast("Failed to load pending orders.", "danger");
  }
}

// ========== AUTO FULFILL / AUTO DROP ==========

async function handleAutoFulfill(orderId) {
  try {
    // 1) kunin full order
    const orders = await dbSelect("orders", "*", { id: orderId });
    const order = orders && orders[0];
    if (!order) {
      showToast("Order not found.", "danger");
      return;
    }

    // 2) hanap ng 1 STOCK na available
    //   – unang titingnan: match product + account_type + duration
    //   – kung wala, babagsak sa match product + status=available
    let stockMatch = {
      product_id: order.product_id,
      status: "available"
    };

    // kung meron account_type / duration sa order, isama natin
    if (order.account_type) stockMatch.account_type = order.account_type;
    if (order.duration) stockMatch.duration = order.duration;

    let stocks = await dbSelect("stocks", "*", stockMatch);

    // fallback: product + available lang
    if (!stocks || !stocks.length) {
      stocks = await dbSelect("stocks", "*", {
        product_id: order.product_id,
        status: "available"
      });
    }

    if (!stocks || !stocks.length) {
      showToast(
        "No available stock that matches this order. Please add stock first.",
        "warning"
      );
      return;
    }

    const stock = stocks[0];

    // 3) gumawa ng RECORD entry (para sa records tab)
    const today = new Date();
    const isoDate = today.toISOString().slice(0, 10); // YYYY-MM-DD

    await dbInsert("records", {
      order_id: order.id,
      buyer_id: order.buyer_id,
      product_id: order.product_id,
      product_name: order.product_id, // pwede mo palitan later via join
      account_type: order.account_type || stock.account_type,
      duration: order.duration || stock.duration,
      price: order.price,
      purchase_date: isoDate,
      add_days: 0,
      email: stock.email,
      password: stock.password,
      profile: stock.profile,
      pin: stock.pin
    });

    // 4) update stock → sold
    await dbUpdate("stocks", { id: stock.id }, { status: "sold" });

    // 5) update order → delivered
    await dbUpdate("orders", { id: order.id }, { status: "delivered" });

    showToast(`Order ${order.id} fulfilled and account assigned.`, "success");

    // 6) refresh UI
    await loadPendingOrders();
    if (window.refreshTopStats) window.refreshTopStats();
  } catch (err) {
    console.error("[orders] handleAutoFulfill error:", err);
    showToast("Failed to auto-assign this order.", "danger");
  }
        }
