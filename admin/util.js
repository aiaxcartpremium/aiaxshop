// =========================
//  UTILS.JS — SHARED HELPERS
// =========================

// -------------------------
// 1. SIMPLE TOAST SYSTEM
// -------------------------
export function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const id = "toast-" + Math.random().toString(36).slice(2, 9);

    const toast = document.createElement("div");
    toast.id = id;
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute("role", "alert");

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${escapeHTML(message)}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    container.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    toast.addEventListener("hidden.bs.toast", () => toast.remove());
}

// -------------------------
// 2. ESCAPE HTML FOR SAFETY
// -------------------------
export function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

// -------------------------
// 3. RANDOM ID GENERATOR
// -------------------------
export function generateId(prefix = "AXP") {
    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()}`;
}

// -------------------------
// 4. DATE HELPERS
// -------------------------
export function today() {
    return new Date().toISOString().split("T")[0];
}

export function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
}

// -------------------------
// 5. TAB SWITCHING
// -------------------------
export function setupTabs() {
    const tabs = document.querySelectorAll(".tab");
    const panels = document.querySelectorAll(".panel");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            panels.forEach((p) => p.classList.remove("active"));

            tab.classList.add("active");

            const target = tab.dataset.target;
            const panel = document.getElementById(target);
            if (panel) panel.classList.add("active");
        });
    });
}

// -------------------------
// 6. CONFIRMATION DIALOG
// -------------------------
export async function confirmAction(msg) {
    return new Promise((resolve) => {
        const ok = window.confirm(msg);
        resolve(ok);
    });
}

// -------------------------
// 7. LOADING INDICATOR
// -------------------------
export function setLoading(containerId, isLoading, msg = "Loading...") {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (isLoading) {
        el.innerHTML = `
            <div class="text-center p-3">
                <div class="spinner-border text-primary"></div>
                <div class="mt-2 text-muted">${escapeHTML(msg)}</div>
            </div>
        `;
    }
}

// -------------------------
// 8. CLEAR & FILL CONTENT
// -------------------------
export function fill(containerId, html) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
}

export function clear(containerId) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = "";
}

// -------------------------
// 9. FORMAT PRICE
// -------------------------
export function peso(amount) {
    if (isNaN(amount)) return "₱0";
    return "₱" + Number(amount).toLocaleString();
}

// -------------------------
// 10. SLEEP (DELAY)
// -------------------------
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
