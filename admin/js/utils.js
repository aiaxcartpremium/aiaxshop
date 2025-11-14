/* ============================================================
   utils.js — Core utilities used across ALL admin modules
   Aiaxcart Premium Shop — Secure Modular Version (Admin)
   ============================================================ */

/* -------------------------
   Toast Notification System
   ------------------------- */
export function showToast(message, type = "info", duration = 3500) {
    const container = document.getElementById("toast-container");
    if (!container) return console.warn("Toast container missing");

    const toast = document.createElement("div");
    toast.className = `toast-item toast-${type}`;
    toast.innerHTML = `
        <div class="toast-text">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        setTimeout(() => toast.remove(), 500);
    }, duration);
}

/* Toast CSS injected automatically */
(function injectToastCSS() {
    const style = document.createElement("style");
    style.innerHTML = `
        #toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .toast-item {
            min-width: 260px;
            padding: 12px 16px;
            border-radius: 10px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 18px rgba(0,0,0,0.15);
            opacity: 0;
            transform: translateX(20px);
            animation: toast-slide-in 0.25s forwards;
        }

        .toast-info    { background: #3b82f6; }
        .toast-success { background: #22c55e; }
        .toast-warning { background: #f59e0b; }
        .toast-error   { background: #ef4444; }

        .fade-out {
            opacity: 0 !important;
            transform: translateX(20px) !important;
            transition: all 0.4s ease;
        }

        @keyframes toast-slide-in {
            from { opacity: 0; transform: translateX(20px); }
            to   { opacity: 1; transform: translateX(0px); }
        }
    `;
    document.head.appendChild(style);
})();


/* -------------------------
   Confirmation Dialog
   ------------------------- */
export async function confirmBox(message = "Are you sure?") {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";

        overlay.innerHTML = `
            <div class="confirm-card">
                <div class="confirm-text">${message}</div>
                <div class="confirm-actions">
                    <button id="confirm-no">Cancel</button>
                    <button id="confirm-yes">Confirm</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        document.getElementById("confirm-yes").onclick = () => {
            overlay.remove();
            resolve(true);
        };
        document.getElementById("confirm-no").onclick = () => {
            overlay.remove();
            resolve(false);
        };
    });
}

/* Confirmation CSS */
(function injectConfirmCSS() {
    const style = document.createElement("style");
    style.innerHTML = `
        .confirm-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.45);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
        }

        .confirm-card {
            background: #fff;
            padding: 24px;
            border-radius: 14px;
            width: 300px;
            text-align: center;
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }

        .confirm-text {
            font-size: 15px;
            margin-bottom: 18px;
            font-weight: 500;
        }

        .confirm-actions {
            display: flex;
            justify-content: space-between;
        }

        .confirm-actions button {
            flex: 1;
            padding: 8px 14px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            margin: 0 4px;
            font-weight: 600;
        }

        #confirm-no {
            background: #e5e7eb;
        }

        #confirm-yes {
            background: #ef4444;
            color: white;
        }
    `;
    document.head.appendChild(style);
})();


/* -------------------------
   Input Sanitizer
   ------------------------- */
export function cleanText(text = "") {
    return text
        .replace(/<[^>]*>?/gm, "")   // remove HTML tags
        .replace(/script/gi, "")     // remove JS injection
        .trim();
}


/* -------------------------
   Random ID Generator
   ------------------------- */
export function generateId(prefix = "AXP") {
    return (
        prefix +
        "-" +
        Date.now().toString(36).toUpperCase() +
        "-" +
        Math.random().toString(36).substring(2, 9).toUpperCase()
    );
}


/* -------------------------
   Date Helpers
   ------------------------- */
export function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
}

export function addDays(dateStr, days = 0) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
}


/* -------------------------
   DOM Helper
   ------------------------- */
export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => document.querySelectorAll(sel);


/* -------------------------
   Loading Overlay
   ------------------------- */
export function showLoader() {
    let loader = document.getElementById("global-loader");
    if (!loader) {
        loader = document.createElement("div");
        loader.id = "global-loader";
        loader.innerHTML = `<div class="loader-spinner"></div>`;
        document.body.appendChild(loader);

        const style = document.createElement("style");
        style.innerHTML = `
            #global-loader {
                position: fixed;
                inset: 0;
                background: rgba(255,255,255,0.75);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 999999;
            }

            .loader-spinner {
                width: 48px;
                height: 48px;
                border: 4px solid #ffb0b5;
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 0.7s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    loader.style.display = "flex";
}

export function hideLoader() {
    const loader = document.getElementById("global-loader");
    if (loader) loader.style.display = "none";
}

