// ================================
// utils.js — Shared Helper Functions
// ================================

// Format to: Jan 12, 2025 – 3:11 PM (PH Time)
export function formatPHDate(dateInput) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);

  return d.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Only Date — Jan 12, 2025
export function formatPHDateShort(dateInput) {
  if (!dateInput) return "-";
  const d = new Date(dateInput);

  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Money (₱1,234.00)
export function formatMoney(amount) {
  const n = Number(amount) || 0;
  return "₱" + n.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Remove extra spaces
export function cleanText(s = "") {
  return (s || "").trim();
}

// Convert file → base64 (for payment proof uploads)
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Show small alert (buyer side)
export function smallAlert(msg, type = "info") {
  alert(msg); // simple for now (you can replace with toast)
}

// Validate email (basic)
export function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// Compute expiry for durations: 7d, 14d, 1m, 6m, 3m W, etc.
export function computeExpiry(durationCode, startDate = new Date()) {
  const start = new Date(startDate);
  const str = String(durationCode).toLowerCase();

  const num = parseInt(str);
  if (!num) return null;

  let unit = "d";
  if (str.includes("m")) unit = "m"; // month
  if (str.includes("w")) unit = "w"; // week
  if (str.includes("y")) unit = "y"; // year

  const d = new Date(start);

  switch (unit) {
    case "d":
      d.setDate(d.getDate() + num);
      break;

    case "w":
      d.setDate(d.getDate() + num * 7);
      break;

    case "m":
      d.setMonth(d.getMonth() + num);
      break;

    case "y":
      d.setFullYear(d.getFullYear() + num);
      break;
  }

  return d.toISOString().split("T")[0];
}