// ===============================
// admin.js — CORE ENGINE
// ===============================

// Import shared modules
import { setupTabs, showToast } from "./utils.js";
import { isAdmin } from "./supabase.js";

// Import feature modules
import { initProductsModule, refreshProductsStats } from "./products.js";
import { initStocksModule, refreshStocksStats } from "./stocks.js";
import { initOrdersModule, refreshPendingStats } from "./orders.js";
import { initRecordsModule, refreshRevenueStats } from "./records.js";
import { initRulesModule } from "./rules.js";
import { initReportsModule } from "./reports.js";

// ===============================
// GLOBAL STATE
// ===============================
let CURRENT_ADMIN_UID = null;

// ===============================
// OWNER VERIFICATION
// ===============================
export async function verifyOwnerUID() {
    const uid = document.getElementById("ownerUidInput").value.trim();
    const msg = document.getElementById("ownerVeriMsg");

    msg.innerHTML = "";

    // 1) Check database admin_uids
    const allowed = await isAdmin(uid);

    if (!allowed) {
        msg.innerHTML = "❌ Invalid UID.";
        return;
    }

    CURRENT_ADMIN_UID = uid;
    localStorage.setItem("aiax_admin_uid", uid);

    closeOwnerModal();
    startAdminPanel();
    showToast("Admin access granted!", "success");
}

export function closeOwnerModal() {
    document.getElementById("ownerOverlay").style.display = "none";
}

export function openOwnerModal() {
    document.getElementById("ownerVeriMsg").innerHTML = "";
    document.getElementById("ownerUidInput").value = "";
    document.getElementById("ownerOverlay").style.display = "flex";
}

// ===============================
// DASHBOARD COUNTERS COMBINED
// ===============================
async function refreshDashboardStats() {
    await refreshProductsStats();
    await refreshStocksStats();
    await refreshPendingStats();
    await refreshRevenueStats();
}

// ===============================
// START ADMIN PANEL
// ===============================
async function startAdminPanel() {
    document.getElementById("adminPanel").style.display = "block";

    // Load panels in sequence
    await initProductsModule();
    await initStocksModule();
    await initOrdersModule();
    await initRecordsModule();
    await initRulesModule();
    await initReportsModule();

    // Update stats
    await refreshDashboardStats();
}

// ===============================
// INIT ON PAGE LOAD
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
    setupTabs();

    const savedUID = localStorage.getItem("aiax_admin_uid");

    if (savedUID && (await isAdmin(savedUID))) {
        CURRENT_ADMIN_UID = savedUID;
        startAdminPanel();
    } else {
        openOwnerModal();
    }
});

// For inline HTML button access
window.verifyOwnerUID = verifyOwnerUID;
window.closeOwnerModal = closeOwnerModal;
