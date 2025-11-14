/* ============================================================
   admin.js — Main Admin Shell / Bootstrapping
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import { showToast } from "./utils.js";
import { dbSelect } from "./supabase.js";

import { initProductsModule } from "./products.js";
import { initStocksModule } from "./stocks.js";
import { initOrdersModule } from "./orders.js";
import { initRecordsModule } from "./records.js";
import { initRulesModule } from "./rules.js";
import { initReportsModule } from "./reports.js";

/* -------------------------------------------------------------
   ENTRY POINT
------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  setupSidebarTabs();
  bootstrapAdmin();
});

/* -------------------------------------------------------------
   Sidebar tabs (left menu)
------------------------------------------------------------- */

function setupSidebarTabs() {
  const buttons = document.querySelectorAll(".sidebar button");
  const panels = document.querySelectorAll(".panel-admin");

  if (!buttons.length || !panels.length) return;

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      if (!targetId) return;

      // active class sa buttons
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      // show/hide panels
      panels.forEach((p) => {
        if (p.id === targetId) {
          p.classList.add("active");
        } else {
          p.classList.remove("active");
        }
      });
    });
  });
}

/* -------------------------------------------------------------
   Boot sequence: init all modules + stats
------------------------------------------------------------- */

async function bootstrapAdmin() {
  try {
    // dito mo ilalagay in the future yung admin auth / gate
    // e.g. ensureAdminSession()

    // init bawat module (render contents sa kani-kaniyang panel)
    await initProductsModule();
    await initStocksModule();
    await initOrdersModule();
    await initRecordsModule();
    await initRulesModule();
    await initReportsModule();

    // initial dashboard stats
    await refreshDashboardStats();

    showToast("Admin loaded successfully.", "success");
  } catch (err) {
    console.error("Error bootstrapping admin:", err);
    showToast("Failed to load admin. Check console.", "error");
  }
}

/* -------------------------------------------------------------
   Dashboard stats (top 4 cards)
------------------------------------------------------------- */

export async function refreshDashboardStats() {
  try {
    const [products, stocks, orders, records] = await Promise.all([
      dbSelect("products", {}),
      dbSelect("stocks", {}),
      dbSelect("orders", {}),
      dbSelect("records", {}),
    ]);

    const productsCount = (products || []).length;
    const availableStocks = (stocks || []).filter(
      (s) => (s.status || "").toLowerCase() === "available"
    ).length;
    const pendingOrders = (orders || []).filter(
      (o) => (o.status || "").toLowerCase() === "pending"
    ).length;
    const totalRevenue = (records || []).reduce(
      (sum, r) => sum + Number(r.price || 0),
      0
    );

    setText("stat-products", productsCount);
    setText("stat-stock", availableStocks);
    setText("stat-pending", pendingOrders);
    setText("stat-revenue", "₱" + totalRevenue.toFixed(2));
  } catch (err) {
    console.error("Error refreshing dashboard stats:", err);
  }
}

// para ma-trigger from ibang modules kung kailangan
window.refreshDashboardStats = refreshDashboardStats;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}