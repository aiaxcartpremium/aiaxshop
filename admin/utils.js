// ==========================================
// utils.js — SHARED UTILITIES
// ==========================================

// Fill HTML of an element
export function fill(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

// Clear an element
export function clear(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
}

// Generate unique ID
export function generateId() {
    return "ID-" + Math.random().toString(36).substring(2, 10) + Date.now();
}

// Toast Notifications
export function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-bg-${type} border-0 show`;
    toast.style.minWidth = "280px";
    toast.style.marginBottom = "10px";

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button class="btn-close btn-close-white me-2 m-auto" onclick="this.parentElement.parentElement.remove()"></button>
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Tab switching (UI)
export function setupTabs() {
    const tabs = document.querySelectorAll("[data-target]");
    const panels = document.querySelectorAll(".panel");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const target = tab.dataset.target;

            // Remove active from tabs
            tabs.forEach(t => t.classList.remove("active"));

            // Hide all panels
            panels.forEach(p => p.style.display = "none");

            // Activate selected
            tab.classList.add("active");
            document.getElementById(target).style.display = "block";
        });
    });
}
