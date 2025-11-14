/* ============================================================
   orders.js — Orders Management (Pending Orders Panel)
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import {
    showToast,
    confirmBox,
    formatDate,
    cleanText,
    generateId
} from "./utils.js";

import {
    dbSelect,
    dbUpdate,
    dbInsert
} from "./supabase.js";

import { getProducts } from "./products.js";
import { refreshStocksStats } from "./stocks.js";
import { refreshRevenueStats } from "./records.js";

// In-memory cache
let ORDERS = [];
let PRODUCTS = [];

/* -------------------------------------------------------------
   Exported for admin.js
------------------------------------------------------------- */

export async function initOrdersModule() {
    PRODUCTS = getProducts();
    await loadOrdersFromDB();
    renderPendingOrders();
}

export async function refreshPendingStats() {
    if (!ORDERS.length) await loadOrdersFromDB();
    const pending = ORDERS.filter(o => (o.status || "").toLowerCase() === "pending").length;
    const el = document.getElementById("stat-pending");
    if (el) el.textContent = pending;
}

/* -------------------------------------------------------------
   Load Orders from DB
------------------------------------------------------------- */

async function loadOrdersFromDB() {
    const data = await dbSelect("orders", {
        order: { column: "created_at", asc: false }
    });

    ORDERS = data || [];
}

/* -------------------------------------------------------------
   RENDER: Pending Orders Panel (panel-pending-orders)
------------------------------------------------------------- */

function renderPendingOrders() {
    const panel = document.getElementById("panel-pending-orders");
    if (!panel) return;

    const pending = ORDERS.filter(
        o => (o.status || "").toLowerCase() === "pending"
    );

    if (!pending.length) {
        panel.innerHTML = `
            <div class="card-clean">
                <h3>Pending Orders</h3>
                <p class="mb-0">No pending orders at the moment.</p>
            </div>
        `;
        return;
    }

    const html = pending.map(o => {
        const product = PRODUCTS.find(p => p.id === o.product_id);
        return `
            <div class="card-clean mb-3">
                <div class="d-flex justify-content-between">
                    <div>
                        <h5>Order #${o.id}</h5>
                        <div><b>Buyer ID:</b> ${o.buyer_id ?? "-"}</div>
                        <div><b>Product:</b> ${product?.name || o.product_id}</div>
                        <div><b>Type:</b> ${o.account_type}</div>
                        <div><b>Duration:</b> ${o.duration}</div>
                        <div><b>Price:</b> ₱${o.price}</div>
                        <div><b>Payment Method:</b> ${o.payment_method || "-"}</div>
                        <div><b>Reference #:</b> ${o.reference_number || "-"}</div>
                        <div><b>Invite Email:</b> ${o.invite_email || "-"}</div>
                        <div class="text-muted mt-1">
                            Placed: ${formatDate(o.created_at)}
                        </div>
                    </div>

                    <div class="text-end">
                        <button class="btn btn-success btn-sm mb-2"
                                onclick="window.approveOrder('${o.id}')">
                            Approve & Assign
                        </button><br>
                        <button class="btn btn-danger btn-sm"
                                onclick="window.cancelOrder('${o.id}')">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    panel.innerHTML = `
        <h3>Pending Orders</h3>
        ${html}
    `;
}

/* -------------------------------------------------------------
   APPROVE ORDER:
   - Find matching available stock
   - Mark stock as sold
   - Create record in records table
   - Set order status = completed
------------------------------------------------------------- */

window.approveOrder = async function (orderId) {
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) return;

    const ok = await confirmBox(
        `Approve this order and assign an account?\n\nOrder #: ${order.id}`
    );
    if (!ok) return;

    // 1) Find matching stock
    const stockList = await dbSelect("stocks", {
        match: {
            product_id: order.product_id,
            account_type: order.account_type,
            duration: order.duration,
            status: "available"
        },
        order: { column: "created_at", asc: true }
    });

    if (!stockList || !stockList.length) {
        showToast("No available stock for this product/type/duration.", "warning");
        return;
    }

    const stock = stockList[0]; // use oldest available

    // 2) Mark stock as sold
    const updStock = await dbUpdate("stocks", { id: stock.id }, { status: "sold" });
    if (updStock === null) return;

    // 3) Load buyer name (optional)
    let buyerName = `Buyer #${order.buyer_id ?? ""}`;
    if (order.buyer_id) {
        const buyerData = await dbSelect("buyers", {
            match: { id: order.buyer_id }
        });
        if (buyerData && buyerData[0] && buyerData[0].name) {
            buyerName = buyerData[0].name;
        }
    }

    // 4) Create record in records table
    const purchaseDate = order.created_at
        ? formatDate(order.created_at)
        : formatDate(new Date().toISOString());

    const recordPayload = {
        id: generateId("REC"),
        order_id: order.id,
        buyer: cleanText(buyerName),
        source: "website",
        product_id: order.product_id,
        account_type: order.account_type,
        duration: order.duration,
        purchase_date: purchaseDate,
        additional_days: 0,
        email: stock.email,
        password: stock.password,
        profile: stock.profile,
        pin: stock.pin,
        price: order.price,
        status: "sold",
        created_at: new Date().toISOString()
    };

    const insertedRecord = await dbInsert("records", recordPayload);
    if (insertedRecord === null) {
        showToast("Stock marked sold but failed to record sale.", "error");
        return;
    }

    // 5) Update order status
    const updOrder = await dbUpdate("orders", { id: order.id }, { status: "completed" });
    if (updOrder === null) return;

    showToast("Order approved, account assigned & recorded.", "success");

    // 6) Refresh data + stats
    await loadOrdersFromDB();
    renderPendingOrders();
    await refreshPendingStats();
    await refreshStocksStats();
    await refreshRevenueStats();
};

/* -------------------------------------------------------------
   CANCEL ORDER:
   - Set status = cancelled
------------------------------------------------------------- */

window.cancelOrder = async function (orderId) {
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) return;

    const ok = await confirmBox(
        `Cancel this order?\n\nOrder #: ${order.id}`
    );
    if (!ok) return;

    const updOrder = await dbUpdate("orders", { id: order.id }, { status: "cancelled" });
    if (updOrder === null) return;

    showToast("Order cancelled.", "warning");

    await loadOrdersFromDB();
    renderPendingOrders();
    await refreshPendingStats();
};