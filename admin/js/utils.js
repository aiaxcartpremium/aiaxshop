// admin/js/utils.js
// Shared helpers (toast notifications, formatting, etc.)

// Show Bootstrap toast (requires #toastContainer sa HTML)
export function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) {
    // fallback
    alert(message);
    return;
  }

  // map type -> bootstrap color
  const map = {
    info: "primary",
    success: "success",
    warning: "warning",
    danger: "danger",
    error: "danger",
  };
  const color = map[type] || "primary";

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-bg-${color} border-0`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;

  container.appendChild(toast);

  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  toast.addEventListener("hidden.bs.toast", () => {
    toast.remove();
  });
}

export function formatCurrency(num) {
  const n = Number(num) || 0;
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
