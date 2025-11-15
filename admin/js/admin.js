// admin/js/admin.js
// Main shell para sa admin panels

import { dbSelect } from "./supabase.js";
import { initProductsModule } from "./products.js";
import { initStocksModule } from "./stocks.js";
import { initOrdersModule } from "./orders.js";
import { initRecordsModule } from "./records.js";
import { initRulesModule } from "./rules.js";
import { initReportsModule } from "./reports.js";

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function refreshTopStats() {
  try {
    const [prodRows, orderRows, recordRows] = await Promise.all([
      dbSelect("products", "id, stock"),
      dbSelect("orders", "id, status, price"),
      dbSelect("records", "price"),
    ]);

    const productsCount = Array.isArray(prodRows) ? prodRows.length : 0;
    const totalStock = Array.isArray(prodRows)
      ? prodRows.reduce((sum, p) => sum + safeNumber(p.stock), 0)
      : 0;

    const pendingOrders = Array.isArray(orderRows)
      ? orderRows.filter((o) => (o.status || "").toLowerCase() === "pending")
          .length
      : 0;

    const totalRevenue = Array.isArray(recordRows)
      ? recordRows.reduce((sum, r) => sum + safeNumber(r.price), 0)
      : 0;

    const elProd = document.getElementById("stat-products");
    const elStock = document.getElementById("stat-stock");
    const elPending = document.getElementById("stat-pending");
    const elRevenue = document.getElementById("stat-revenue");

    if (elProd) elProd.textContent = productsCount.toString();
    if (elStock) elStock.textContent = totalStock.toString();
    if (elPending) elPending.textContent = pendingOrders.toString();
    if (elRevenue)
      elRevenue.textContent = `₱${totalRevenue.toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
  } catch (err) {
    console.error("[Admin] refreshTopStats error:", err);
  }
}

// expose para magamit ng ibang modules kung kailangan
window.refreshTopStats = refreshTopStats;

document.addEventListener("DOMContentLoaded", async () => {
  // 1) i-update muna yung stats sa itaas
  await refreshTopStats();

  // 2) i-init lahat ng panels – dito nagre-render yung laman
  try {
    if (typeof initProductsModule === "function") initProductsModule();
  } catch (err) {
    console.error("[Admin] initProductsModule error:", err);
  }

  try {
    if (typeof initStocksModule === "function") initStocksModule();
  } catch (err) {
    console.error("[Admin] initStocksModule error:", err);
  }

  try {
    if (typeof initOrdersModule === "function") initOrdersModule();
  } catch (err) {
    console.error("[Admin] initOrdersModule error:", err);
  }

  try {
    if (typeof initRecordsModule === "function") initRecordsModule();
  } catch (err) {
    console.error("[Admin] initRecordsModule error:", err);
  }

  try {
    if (typeof initRulesModule === "function") initRulesModule();
  } catch (err) {
    console.error("[Admin] initRulesModule error:", err);
  }

  try {
    if (typeof initReportsModule === "function") initReportsModule();
  } catch (err) {
    console.error("[Admin] initReportsModule error:", err);
  }
});