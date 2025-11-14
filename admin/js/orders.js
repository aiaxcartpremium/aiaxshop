// ==============================================
// orders.js — PENDING ORDERS MANAGEMENT MODULE
// ==============================================

import {
    fill,
    showToast,
    generateId
} from "./utils.js";

import {
    fetchTable,
    insertRow,
    updateRow
} from "./supabase.js";

import { loadStocksFromDB } from "./stocks.js";
import { loadProducts } from "./products.js";

// Internal
let ORDERS = [];
let STOCKS = [];
let PRODUCTS = [];

// ==============================================
// INIT MODULE
// ==============================================
export async function initOrdersModule() {
    PRODUCTS = await loadProducts();
    await loadOrdersFromDB();
    await loadStocks();
    renderPendingOrders();
}

// ==============================================
// DASHBOARD COUNT
// ==============================================
export async function refreshPendingStats() {
    const count = ORDERS.filter(o => o.status === "pending").length;
    document.getElementById("stat-pending").textContent = count;
}

// ==============================================
// LOAD DATA
// ==============================================
async function loadOrdersFromDB() {
    ORDERS = await fetchTable("orders");
}

async function loadStocks() {
    STOCKS = await fetchTable("stocks");
}

// ==============================================
// RENDER PENDING ORDERS
// ==============================================
function renderPendingOrders() {
    const pending = ORDERS.filter(o => o.status === "pending");

    if (pending.length === 0) {
        fill("panel-pending-orders", "<p>No pending orders.</p>");
        return;
    }

    const html = pending.map(o => {
        const product = PRODUCTS.find(p => p.id === o.product_id);

        return `
            <div class="card-clean mb-3">
                <h5>${product?.name || "Unknown Product"}</h5>

                <div><b>Buyer ID:</b> ${o.buyer_id}</div>
                <div><b>Account Type:</b> ${o.account_type}</div>
                <div><b>Duration:</b> ${o.duration}</div>
                <div><b>Price:</b> ₱${o.price}</div>
                <div><b>Payment Method:</b> ${o.payment_method}</div>
                <div><b>Reference No.:</b> ${o.reference_number}</div>
                <div><b>Invite Email:</b> ${o.invite_email || "None"}</div>

                <div class="mt-3 text-end">
                    <button class="btn btn-success btn-sm" onclick="approveOrder('${o.id}')">
                        Approve
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectOrder('${o.id}')">
                        Reject
                    </button>
                </div>
            </div>
        `;
    }).join("");

    fill("panel-pending-orders", html);
}

// ==============================================
// APPROVE ORDER (AUTO-ASSIGN STOCK)
// ==============================================
window.approveOrder = async function (orderId) {
    const order = ORDERS.find(o => o.id === orderId);
    if (!order) return;

    // 1. Find stock that matches product, type, duration
    const matched = STOCKS.find(s =>
        s.product_id === order.product_id &&
        s.account_type === order.account_type &&
        s.duration === order.duration &&
        s.status === "available"
    );

    if (!matched) {
        showToast("No available stock matches this order!", "danger");
        return;
    }

    // 2. Mark stock as sold
    await updateRow("stocks", { id: matched.id }, { status: "sold" });

    // 3. Insert sold record
    const record = {
        id: generateId(),
        order_id: order.id,
        buyer: order.buyer_id,
        source: "website",
        product_id: order.product_id,
        account_type: order.account_type,
        duration: order.duration,
        purchase_date: new Date().toISOString().split("T")[0],
        additional_days: 0,
        email: matched.email,
        password: matched.password,
        profile: matched.profile,
        pin: matched.pin,
        price: order.price,
        status: "sold",
        created_at: new Date().toISOString()
    };

    await insertRow("records", record);

    // 4. Update order status
    await updateRow("orders", { id: orderId }, { status: "approved" });

    showToast("Order approved and stock assigned!", "success");

    // Reload data
    await loadOrdersFromDB();
    await loadStocks();
    renderPendingOrders();
    refreshPendingStats();
};

// ==============================================
// REJECT ORDER
// ==============================================
window.rejectOrder = async function (orderId) {
    if (!confirm("Reject this order?")) return;

    await updateRow("orders", { id: orderId }, { status: "rejected" });

    showToast("Order rejected.", "warning");

    await loadOrdersFromDB();
    renderPendingOrders();
    refreshPendingStats();
};
