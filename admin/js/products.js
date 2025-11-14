// admin/js/products.js
// Handles loading products from Supabase + showing Products list
// + helper para sa ibang modules (e.g. Records) para sa product <select>

import { dbSelect } from "./supabase.js";
import { showToast, durationMap } from "./utils.js";

let PRODUCTS_CACHE = [];

// --------- DATA HELPERS ---------

export async function fetchProducts(force = false) {
  if (!force && PRODUCTS_CACHE.length) return PRODUCTS_CACHE;

  try {
    const rows = await dbSelect(
      "products",
      "id,name,category,icon,stock,pricing,created_at,updated_at",
      (q) => q.order("name", { ascending: true })
    );

    PRODUCTS_CACHE = rows ?? [];
    return PRODUCTS_CACHE;
  } catch (err) {
    console.error("fetchProducts error:", err);
    showToast("Failed to load products from database.", "danger");
    return [];
  }
}

export function getProductById(id) {
  return PRODUCTS_CACHE.find((p) => p.id === id) || null;
}

// Used by Records module etc.
export async function fillProductSelect(selectEl) {
  if (!selectEl) return;

  const products = await fetchProducts();
  if (!products.length) {
    selectEl.innerHTML = `<option value="">No products found</option>`;
    return;
  }

  selectEl.innerHTML =
    `<option value="">Select product</option>` +
    products
      .map(
        (p) =>
          `<option value="${p.id}">
            ${p.name} (${p.category})
          </option>`
      )
      .join("");
}

// --------- UI RENDERING FOR "PRODUCTS LIST" PANEL ---------

export async function initProductsModule() {
  const main = document.getElementById("admin-main");
  if (!main) return;

  main.innerHTML = `
    <section class="admin-section">
      <div class="admin-section-head">
        <div>
          <h2 class="admin-title">Products List</h2>
          <p class="admin-subtitle">
            All products are loaded directly from your <code>products</code> table in Supabase.
          </p>
        </div>
        <button id="btn-refresh-products" class="btn btn-secondary btn-sm">
          Refresh
        </button>
      </div>

      <div id="products-list" class="admin-card-list"></div>
    </section>
  `;

  document
    .getElementById("btn-refresh-products")
    ?.addEventListener("click", async () => {
      await fetchProducts(true);
      await renderProductsList();
      showToast("Products refreshed from database.", "success");
    });

  await renderProductsList();
}

async function renderProductsList() {
  const listEl = document.getElementById("products-list");
  if (!listEl) return;

  const products = await fetchProducts();

  if (!products.length) {
    listEl.innerHTML = `
      <div class="admin-empty">
        <p>No products found in database.</p>
        <p class="text-muted">
          Make sure you already ran the SQL seed for the <code>products</code> table.
        </p>
      </div>
    `;
    return;
  }

  listEl.innerHTML = products.map(renderProductCard).join("");
}

function renderProductCard(p) {
  const pricing = p.pricing || {};
  const pricingHtml =
    Object.keys(pricing).length === 0
      ? `<em class="text-muted">No pricing set</em>`
      : Object.entries(pricing)
          .map(([accountType, durations]) => {
            const prices = Object.entries(durations)
              .map(([dur, price]) => {
                const label = durationMap[dur] || dur;
                return `${label}: ₱${price}`;
              })
              .join(", ");

            return `
              <div class="product-price-row">
                <strong>${accountType}</strong>
                <span>— ${prices}</span>
              </div>
            `;
          })
          .join("");

  return `
    <article class="admin-card">
      <header class="admin-card-header">
        <div class="admin-card-title">
          <span class="admin-card-icon">${p.icon || "🛒"}</span>
          <div>
            <div class="admin-card-name">${p.name}</div>
            <div class="admin-card-meta">
              ID: <code>${p.id}</code> • ${p.category}
            </div>
          </div>
        </div>
        <div class="admin-card-badge">
          Stock: ${p.stock ?? 0}
        </div>
      </header>

      <div class="admin-card-body">
        ${pricingHtml}
      </div>

      <footer class="admin-card-footer">
        <small class="text-muted">
          Editing of prices will be added here (using UPDATE on the products table).
        </small>
      </footer>
    </article>
  `;
}