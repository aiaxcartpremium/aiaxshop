// ==========================
// index.js — Buyer Side
// ==========================

import { sb } from "./supabase.js";
import { formatPHDate } from "./utils.js";

// DOM references
const productListEl = document.getElementById("product-list");
const categoryButtons = document.querySelectorAll("[data-category]");
const loginBtn = document.getElementById("btn-login");
const signupBtn = document.getElementById("btn-register");
const logoutBtn = document.getElementById("btn-logout");
const userLabel = document.getElementById("user-label");
const ordersTab = document.getElementById("tab-orders");
const deliveredTab = document.getElementById("tab-delivered");
const sectionOrders = document.getElementById("section-orders");
const sectionDelivered = document.getElementById("section-delivered");

// ==========================
// AUTH HANDLING
// ==========================
async function checkAuth() {
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (session?.user) {
    const email = session.user.email;
    userLabel.textContent = email;

    loginBtn.classList.add("d-none");
    signupBtn.classList.add("d-none");

    logoutBtn.classList.remove("d-none");
  } else {
    userLabel.textContent = "";
    logoutBtn.classList.add("d-none");
    loginBtn.classList.remove("d-none");
    signupBtn.classList.remove("d-none");
  }
}

logoutBtn?.addEventListener("click", async () => {
  await sb.auth.signOut();
  location.reload();
});

// ==========================
// LOAD PRODUCTS
// ==========================
async function loadProducts(category = "all") {
  productListEl.innerHTML =
    '<div class="text-center text-muted py-3">Loading products...</div>';

  try {
    const { data: products, error: productErr } = await sb
      .from("products")
      .select("*")
      .order("name", { ascending: true });

    if (productErr) throw productErr;

    // FILTER
    const filtered =
      category === "all"
        ? products
        : products.filter((p) => p.category === category);

    if (!filtered.length) {
      productListEl.innerHTML =
        '<div class="text-center text-muted py-4">No products found.</div>';
      return;
    }

    let html = "";

    for (const p of filtered) {
      // Fetch price plans for each product
      const { data: prices } = await sb
        .from("product_prices")
        .select("*")
        .eq("product_id", p.id)
        .order("price", { ascending: true });

      // Decide on stock status
      const { data: stockCount } = await sb
        .from("stocks")
        .select("quantity")
        .eq("product_id", p.id)
        .eq("status", "available");

      const totalStock =
        stockCount?.reduce((sum, x) => sum + (x.quantity || 0), 0) || 0;

      html += `
        <div class="product-card shadow-sm">
          <div class="product-header">
            <h3>${p.name}</h3>
            ${
              totalStock > 0
                ? `<span class="badge bg-success">In Stock: ${totalStock}</span>`
                : `<span class="badge bg-danger">Out of Stock</span>`
            }
          </div>
          <div class="product-body">
            ${
              prices?.length
                ? prices
                    .map(
                      (pp) => `
                  <div class="plan-row">
                    <div>
                      <strong>${pp.account_type}</strong>
                      <div class="text-muted small">${pp.duration}</div>
                    </div>
                    <div>
                      <strong>₱${pp.price.toFixed(2)}</strong>
                      ${
                        totalStock > 0
                          ? `<button class="btn btn-primary btn-buy" data-id="${p.id}" data-type="${pp.account_type}" data-duration="${pp.duration}" data-price="${pp.price}">
                              Buy
                            </button>`
                          : `<button class="btn btn-secondary" disabled>Unavailable</button>`
                      }
                    </div>
                  </div>
                `
                    )
                    .join("")
                : `<div class="text-muted small">No price plans yet.</div>`
            }
          </div>
        </div>
      `;
    }

    productListEl.innerHTML = html;
  } catch (err) {
    console.error(err);
    productListEl.innerHTML =
      '<div class="text-center text-danger py-3">Failed to load products.</div>';
  }
}

// ==========================
// CATEGORY FILTER UI
// ==========================
categoryButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    categoryButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const cat = btn.dataset.category;
    loadProducts(cat);
  });
});

// ==========================
// BUY PRODUCT
// ==========================
document.body.addEventListener("click", async (e) => {
  if (!e.target.classList.contains("btn-buy")) return;

  const product_id = e.target.dataset.id;
  const account_type = e.target.dataset.type;
  const duration = e.target.dataset.duration;
  const price = Number(e.target.dataset.price);

  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    alert("Please log in first.");
    return;
  }

  const buyerEmail = session.user.email;

  // Insert pending order
  const { error } = await sb.from("orders").insert([
    {
      buyer_email: buyerEmail,
      product_id,
      account_type,
      duration,
      price,
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    alert("Order failed.");
    console.error(error);
  } else {
    alert("Order placed! Please upload proof of payment.");
    loadOrders();
  }
});

// ==========================
// LOAD ORDERS
// ==========================
async function loadOrders() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return;

  const email = session.user.email;

  const list = document.getElementById("orders-list");
  list.innerHTML =
    '<div class="text-center text-muted py-3">Loading orders...</div>';

  const { data, error } = await sb
    .from("orders")
    .select("*")
    .eq("buyer_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    list.innerHTML =
      '<div class="text-danger text-center py-3">Failed to load orders.</div>';
    return;
  }

  if (!data.length) {
    list.innerHTML =
      '<div class="text-center text-muted py-3">No orders yet.</div>';
    return;
  }

  let html = "";
  data.forEach((o) => {
    html += `
      <div class="order-card">
        <div><strong>${o.product_id}</strong> (${o.account_type} - ${
      o.duration
    })</div>
        <div class="small">₱${o.price}</div>
        <div>Status: <span class="badge bg-warning">${o.status}</span></div>
        <div class="small text-muted">${formatPHDate(o.created_at)}</div>
      </div>
    `;
  });

  list.innerHTML = html;
}

// ==========================
// LOAD DELIVERED ACCOUNTS
// ==========================
async function loadDelivered() {
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return;

  const email = session.user.email;

  const list = document.getElementById("delivered-list");
  list.innerHTML =
    '<div class="text-center py-3 text-muted">Loading delivered accounts...</div>';

  const { data, error } = await sb
    .from("records")
    .select("*")
    .eq("buyer", email)
    .order("purchase_date", { ascending: false });

  if (error) {
    list.innerHTML =
      '<div class="text-danger text-center py-3">Failed to load.</div>';
    return;
  }

  if (!data.length) {
    list.innerHTML =
      '<div class="text-center py-3 text-muted">No delivered accounts yet.</div>';
    return;
  }

  let html = "";
  data.forEach((r) => {
    html += `
      <div class="delivered-card">
        <h4>${r.product_id}</h4>
        <div>${r.account_type} (${r.duration})</div>
        <div>Email: <strong>${r.account_email}</strong></div>
        <div>Password: <strong>${r.account_password}</strong></div>
        <div>Profile: ${r.profile || "-"}</div>

        <div class="small text-muted mt-2">
          Purchased: ${formatPHDate(r.purchase_date)}<br>
          Expiry: ${formatPHDate(r.expiry_date)}
        </div>
      </div>
    `;
  });

  list.innerHTML = html;
}

// ==========================
// TAB SWITCHING
// ==========================
ordersTab.addEventListener("click", () => {
  ordersTab.classList.add("active");
  deliveredTab.classList.remove("active");

  sectionOrders.classList.remove("d-none");
  sectionDelivered.classList.add("d-none");

  loadOrders();
});

deliveredTab.addEventListener("click", () => {
  deliveredTab.classList.add("active");
  ordersTab.classList.remove("active");

  sectionDelivered.classList.remove("d-none");
  sectionOrders.classList.add("d-none");

  loadDelivered();
});

// ==========================
// INITIAL LOAD
// ==========================
checkAuth();
loadProducts("all");