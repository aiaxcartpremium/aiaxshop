/* ============================================================
   admin.js — Main controller for Aiaxcart Premium Admin Panel
   Uses STRICT admin security via Supabase (Version A)
   ============================================================ */

import { showToast, showLoader, hideLoader } from "./utils.js";
import { ensureAdminSession } from "./supabase.js";

import { initProductsModule, refreshProductsStats } from "./products.js";
import { initStocksModule, refreshStocksStats } from "./stocks.js";
import { initOrdersModule, refreshPendingStats } from "./orders.js";
import { initRecordsModule, refreshRevenueStats } from "./records.js";
import { initRulesModule } from "./rules.js";
import { initReportsModule } from "./reports.js";

/* -------------------------------------------------------------
   1. TAB / SIDEBAR HANDLING
------------------------------------------------------------- */

function setupSidebarTabs() {
    const buttons = document.querySelectorAll(".sidebar button[data-target]");
    const panels = document.querySelectorAll(".panel");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            const target = btn.dataset.target;

            // active state
            buttons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // show / hide panels
            panels.forEach(p => {
                if (p.id === target) {
                    p.style.display = "block";
                } else {
                    p.style.display = "none";
                }
            });
        });
    });
}

/* -------------------------------------------------------------
   2. DASHBOARD STAT REFRESH
------------------------------------------------------------- */

async function refreshDashboardStats() {
    await refreshProductsStats();
    await refreshStocksStats();
    await refreshPendingStats();
    await refreshRevenueStats();
}

/* -------------------------------------------------------------
   3. MAIN ADMIN BOOTSTRAP
------------------------------------------------------------- */

async function startAdmin() {
    try {
        showLoader();

        // 1) Check if logged-in user is valid admin
        const ok = await ensureAdminSession();
        if (!ok) {
            hideLoader();
            return;
        }

        // 2) Init modules (order matters a bit)
        await initProductsModule();
        await initStocksModule();
        await initOrdersModule();
        await initRecordsModule();
        await initRulesModule();
        await initReportsModule();

        // 3) Refresh dashboard stats
        await refreshDashboardStats();

        hideLoader();
        showToast("Admin panel ready.", "success");
    } catch (err) {
        console.error("Admin init error:", err);
        hideLoader();
        showToast("Something went wrong loading the admin panel.", "error");
    }
}

/* -------------------------------------------------------------
   4. DOM LOADED ENTRY POINT
------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // tab / sidebar behaviour
    setupSidebarTabs();

    // dashboard is default visible (already set in HTML)
    // now bootstrap the admin app
    startAdmin();
});

/* -------------------------------------------------------------
   5. OPTIONAL: Dummy functions for old HTML hooks
      (so walang error kung may natirang onclick sa HTML)
------------------------------------------------------------- */

// These are here only so if may natitirang onclick="verifyOwnerUID()"
// sa lumang HTML, hindi siya mag-e-error. Pero hindi na ginagamit
// sa strict Version A (auth via Supabase only).

window.verifyOwnerUID = function () {
    showToast("UID modal no longer used. Please log in via main site.", "info");
};
