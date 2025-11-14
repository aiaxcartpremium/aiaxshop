/* ============================================================
   rules.js — Store Rules Management
   Aiaxcart Premium Shop — Admin Side
   ============================================================ */

import { showToast, confirmBox, cleanText } from "./utils.js";
import { dbSelect, dbInsert, dbDelete } from "./supabase.js";
import { getProducts } from "./products.js";

let RULES = [];
let PRODUCTS = [];

/* -------------------------------------------------------------
   Exported for admin.js
------------------------------------------------------------- */

export async function initRulesModule() {
    PRODUCTS = getProducts();
    await loadRulesFromDB();
    renderRulesPanel();
}

/* -------------------------------------------------------------
   Load rules from DB
------------------------------------------------------------- */

async function loadRulesFromDB() {
    const data = await dbSelect("rules", {
        order: { column: "created_at", asc: true }
    });

    RULES = data || [];
}

/* -------------------------------------------------------------
   RENDER: Store Rules Panel (panel-store-rules)
------------------------------------------------------------- */

function renderRulesPanel() {
    const panel = document.getElementById("panel-store-rules");
    if (!panel) return;

    const productOptions =
        `<option value="">(Global / All Products)</option>` +
        getProducts()
            .map((p) => `<option value="${p.id}">${p.name}</option>`)
            .join("");

    const rulesList = RULES.length
        ? RULES.map((r) => {
              const product = PRODUCTS.find((p) => p.id === r.product_id);
              const prodLabel = product
                  ? product.name
                  : r.product_id
                  ? r.product_id
                  : "All Products";

              return `
                <div class="card-clean mb-2">
                    <div class="d-flex justify-content-between">
                        <div>
                            <div class="text-muted small mb-1">
                                Applies to: <b>${prodLabel}</b>
                            </div>
                            <div>${r.rule_text}</div>
                        </div>
                        <div class="text-end">
                            <button class="btn btn-danger btn-sm"
                                    onclick="window.deleteRule(${r.id})">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
              `;
          }).join("")
        : `<p class="text-muted mb-0">No rules yet. Add some below.</p>`;

    panel.innerHTML = `
        <div class="card-clean mb-3">
            <h3>Store Rules</h3>
            ${rulesList}
        </div>

        <div class="card-clean">
            <h4>Add New Rule</h4>

            <div class="mt-2">
                <label class="form-label">Rule Text</label>
                <textarea id="rule-text" class="form-control" rows="3"
                          placeholder="e.g. All accounts are guaranteed to work for the duration purchased."></textarea>
            </div>

            <div class="mt-3">
                <label class="form-label">Applies to Product (optional)</label>
                <select id="rule-product" class="form-select">
                    ${productOptions}
                </select>
            </div>

            <button type="button" class="btn btn-primary mt-3" id="btn-save-rule">
                Save Rule
            </button>
        </div>
    `;

    const btn = document.getElementById("btn-save-rule");
    if (btn) btn.addEventListener("click", saveRule);
}

/* -------------------------------------------------------------
   SAVE: New Rule
------------------------------------------------------------- */

async function saveRule() {
    const textEl = document.getElementById("rule-text");
    const prodEl = document.getElementById("rule-product");

    if (!textEl || !prodEl) return;

    const rule_text = cleanText(textEl.value);
    const product_id = prodEl.value || null;

    if (!rule_text) {
        showToast("Please enter a rule text.", "warning");
        return;
    }

    const payload = {
        rule_text,
        product_id,
        created_at: new Date().toISOString()
    };

    const inserted = await dbInsert("rules", payload);
    if (inserted === null) return;

    showToast("Rule added.", "success");

    textEl.value = "";
    prodEl.value = "";

    await loadRulesFromDB();
    renderRulesPanel();
}

/* -------------------------------------------------------------
   DELETE: Rule
------------------------------------------------------------- */

window.deleteRule = async function (id) {
    const r = RULES.find((x) => x.id === id);
    if (!r) return;

    const ok = await confirmBox("Delete this rule?");
    if (!ok) return;

    const deleted = await dbDelete("rules", { id });
    if (deleted === null) return;

    showToast("Rule deleted.", "error");

    await loadRulesFromDB();
    renderRulesPanel();
};