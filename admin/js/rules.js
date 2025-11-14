// ==========================================
// rules.js — STORE RULES MANAGEMENT MODULE
// ==========================================

import {
    fill,
    showToast,
    generateId
} from "./utils.js";

import {
    fetchTable,
    insertRow,
    deleteRow
} from "./supabase.js";

import { loadProducts } from "./products.js";

// Internal
let RULES = [];
let PRODUCTS = [];

// ==========================================
// INIT MODULE
// ==========================================
export async function initRulesModule() {
    PRODUCTS = await loadProducts();
    await loadRulesFromDB();
    renderRulesPanel();
    prepareAddRulePanel();
}

// ==========================================
// LOAD RULES
// ==========================================
async function loadRulesFromDB() {
    RULES = await fetchTable("rules");
}

// ==========================================
// RULES LIST PANEL
// ==========================================
function renderRulesPanel() {
    if (RULES.length === 0) {
        fill("panel-store-rules", "<p>No rules added yet.</p>");
        return;
    }

    const html = RULES.map(r => {
        const product = PRODUCTS.find(p => p.id === r.product_id);

        return `
            <div class="card-clean mb-2">
                <div class="d-flex justify-content-between">
                    <div>
                        <b>Rule:</b> ${r.rule_text}<br>
                        <small class="text-muted">
                            ${product ? "For: " + product.name : "Applies to all products"}
                        </small>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="deleteRule('${r.id}')">Delete</button>
                </div>
            </div>
        `;
    }).join("");

    fill("panel-store-rules", html);
}

// ==========================================
// ADD RULE PANEL
// ==========================================
function prepareAddRulePanel() {
    const productOptions = PRODUCTS
        .map(p => `<option value="${p.id}">${p.name}</option>`)
        .join("");

    fill("panel-store-rules", `
        <div class="card-clean mb-3">
            <h4>Add New Rule</h4>

            <label>Rule Text
                <textarea id="rule-text" class="form-control" rows="2"></textarea>
            </label>

            <label class="mt-2">Applies To (optional)
                <select id="rule-product" class="form-select">
                    <option value="">All Products</option>
                    ${productOptions}
                </select>
            </label>

            <button class="btn btn-primary mt-3" id="saveRuleBtn">Add Rule</button>
        </div>

        <hr class="my-4">

        <h4>Existing Rules</h4>
        <div id="rulesList"></div>
    `);

    // Load list after panel is created
    renderRulesListInside();

    document.getElementById("saveRuleBtn")
        .addEventListener("click", saveRule);
}

// ==========================================
// RENDER RULES BELOW FORM
// ==========================================
function renderRulesListInside() {
    const containerId = "rulesList";

    if (RULES.length === 0) {
        fill(containerId, "<p>No rules added yet.</p>");
        return;
    }

    const html = RULES.map(r => {
        const product = PRODUCTS.find(p => p.id === r.product_id);
        return `
            <div class="card-clean mb-2">
                <div class="d-flex justify-content-between">
                    <div>
                        <b>${r.rule_text}</b><br>
                        <small class="text-muted">
                            ${product ? product.name : "All Products"}
                        </small>
                    </div>

                    <button class="btn btn-danger btn-sm"
                        onclick="deleteRule('${r.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }).join("");

    fill(containerId, html);
}

// ==========================================
// SAVE RULE
// ==========================================
async function saveRule() {
    const text = document.getElementById("rule-text").value.trim();
    const product_id = document.getElementById("rule-product").value || null;

    if (!text) {
        showToast("Rule text cannot be empty.", "danger");
        return;
    }

    const rule = {
        id: generateId(),
        rule_text: text,
        product_id,
        created_at: new Date().toISOString()
    };

    const ok = await insertRow("rules", rule);
    if (!ok) return;

    showToast("Rule added!", "success");

    // Refresh
    await loadRulesFromDB();
    renderRulesPanel();
    prepareAddRulePanel();
}

// ==========================================
// DELETE RULE
// ==========================================
window.deleteRule = async function (ruleId) {
    if (!confirm("Delete this rule?")) return;

    await deleteRow("rules", { id: ruleId });

    showToast("Rule deleted.", "danger");

    await loadRulesFromDB();
    renderRulesPanel();
    prepareAddRulePanel();
};
