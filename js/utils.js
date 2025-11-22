/* ============================================
   utils.js — Shared Helper Functions
============================================ */

/* ------------------------------
   Format Date (PH)
------------------------------ */
export function formatPHDate(dateStr) {
  if (!dateStr) return "-";

  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;

  return d.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/* ------------------------------
   Format Money (Pesos)
------------------------------ */
export function formatMoney(value) {
  const num = Number(value) || 0;
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/* ------------------------------
   Auto-generate UUID
------------------------------ */
export function uuid() {
  return crypto.randomUUID();
}

/* ------------------------------
   Create Element (shortcut)
------------------------------ */
export function el(tag, attrs = {}, content = "") {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.substring(2), value);
    } else {
      element.setAttribute(key, value);
    }
  }

  if (content !== "" && content !== null && content !== undefined) {
    element.innerHTML = content;
  }

  return element;
}

/* ------------------------------
   Load image preview
------------------------------ */
export function previewImage(fileInput, previewEl) {
  const file = fileInput.files?.[0];
  if (!file) return (previewEl.style.display = "none");

  const reader = new FileReader();
  reader.onload = (e) => {
    previewEl.src = e.target.result;
    previewEl.style.display = "block";
  };
  reader.readAsDataURL(file);
}

/* ------------------------------
   Quick alert box (in-page)
------------------------------ */
export function showToast(message, type = "info") {
  let box = document.createElement("div");
  box.className = `toast-message toast-${type}`;
  box.textContent = message;

  Object.assign(box.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: type === "error" ? "#e63946" : "#1d3557",
    color: "white",
    padding: "10px 15px",
    borderRadius: "6px",
    fontSize: "14px",
    zIndex: "9999",
    opacity: "0",
    transition: "0.3s"
  });

  document.body.appendChild(box);

  setTimeout(() => (box.style.opacity = "1"), 50);

  setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => box.remove(), 300);
  }, 2500);
}