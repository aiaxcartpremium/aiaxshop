// js/utils.js
// Shared helper functions for buyer UI

export function formatPrice(value) {
  if (!value || isNaN(value)) return "₱0";
  return "₱" + Number(value).toLocaleString("en-PH");
}

export function formatDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch (e) {
    return d;
  }
}

export function addMonths(dateStr, months = 1) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function addDays(dateStr, days = 1) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function createElement(html) {
  const temp = document.createElement("div");
  temp.innerHTML = html.trim();
  return temp.firstChild;
}