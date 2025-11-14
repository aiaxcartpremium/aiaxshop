/*
  admin.js – Main Admin Shell / Bootstrapper
  Aiaxcart Premium Shop – Admin Side
*/

import { showToast } from "./utils.js";
import { dbSelect } from "./supabase.js";

import { initProductsModule } from "./products.js";
import { initStocksModule } from "./stocks.js";
import { initOrdersModule } from "./orders.js";
import { initRecordsModule } from "./records.js";
import { initRulesModule } from "./rules.js";
import { initReportsModule } from "./reports.js";

function safeInit(label, fn) {
  if (typeof fn !== "function") return;

  try {
    const maybePromise = fn();
    if (maybePromise && typeof maybePromise.then === "function") {
      maybePromise.catch((err) => {
        console.error(`Error in ${label} module (async)`, err);
        if (typeof showToast === "function") {
          showToast(`Error loading ${label} module`, "danger");
        }
      });
    }
  } catch (err) {
    console.error(`Error in ${label} module`, err);
    if (typeof showToast === "function") {
      showToast(`Error loading ${label} module`, "danger");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  safeInit("Products", initProductsModule);
  safeInit("Stocks", initStocksModule);
  safeInit("Orders", initOrdersModule);
  safeInit("Records", initRecordsModule);
  safeInit("Rules", initRulesModule);
  safeInit("Reports", initReportsModule);
});

export {};