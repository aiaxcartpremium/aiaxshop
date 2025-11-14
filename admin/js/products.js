// admin/js/products.js
// Handles loading products (Supabase + fallback default list)
// + Products List panel + helpers for other modules

import { dbSelect } from "./supabase.js";
import { showToast, durationMap } from "./utils.js";

let PRODUCTS_CACHE = [];
let USING_DEFAULT_PRODUCTS = false;

/* =========================================================
   DEFAULT PRODUCTS (fallback kapag walang laman ang DB)
   ========================================================= */

const DEFAULT_PRODUCTS = [
  // Entertainment
  { 
    id: "netflix",
    name: "Netflix Premium",
    category: "entertainment",
    icon: "📺",
    stock: 15,
    pricing: {
      "solo profile": { "1m": 160, "2m": 280, "3m": 435, "4m": 565, "6m": 850, "8m": 1090, "12m": 1500 },
      "shared profile": { "1m": 80, "2m": 145, "3m": 205, "4m": 270, "6m": 410, "8m": 520, "12m": 800 }
    }
  },
  { 
    id: "viu",
    name: "Viu Premium",
    category: "entertainment",
    icon: "🎬",
    stock: 8,
    pricing: {
      "solo account": { "1m": 70, "2m": 105, "3m": 145, "4m": 170, "6m": 205, "10m": 280, "12m": 310 },
      "shared account": { "1m": 30, "2m": 55, "3m": 75, "4m": 90, "6m": 120, "10m": 190, "12m": 220 }
    }
  },
  { 
    id: "viva-max",
    name: "VIVAMAX VIVAONE",
    category: "entertainment",
    icon: "🎭",
    stock: 15,
    pricing: {
      "solo account": { "1m": 110, "2m": 145, "3m": 170 },
      "shared account": { "1m": 65, "2m": 90, "3m": 120 }
    }
  },
  { 
    id: "wetv",
    name: "WeTV",
    category: "entertainment",
    icon: "📱",
    stock: 8,
    pricing: {
      "solo account": { "1m": 150 },
      "shared account": { "1m": 55, "2m": 95, "3m": 135 }
    }
  },
  { 
    id: "iwant-tfc",
    name: "IWANT TFC",
    category: "entertainment",
    icon: "📺",
    stock: 8,
    pricing: {
      "solo account": { "1m": 145 },
      "shared account": { "1m": 50, "2m": 90, "3m": 125 }
    }
  },
  { 
    id: "crunchyroll",
    name: "Crunchyroll",
    category: "entertainment",
    icon: "🎮",
    stock: 10,
    pricing: {
      "solo profile": { "1m": 75, "2m": 115, "3m": 160, "4m": 195 },
      "shared profile": { "1m": 35, "2m": 60, "3m": 90, "4m": 115 }
    }
  },
  { 
    id: "disney-plus",
    name: "Disney+",
    category: "entertainment",
    icon: "🦁",
    stock: 12,
    pricing: {
      "solo account": { "1m": 390 },
      "solo profile": { "1m": 160, "2m": 315, "4m": 630, "10m": 1480, "12m": 1700 },
      "shared profile": { "1m": 85, "2m": 165, "4m": 330, "10m": 720, "12m": 880 }
    }
  },
  { 
    id: "bilibili",
    name: "Bilibili",
    category: "entertainment",
    icon: "📺",
    stock: 6,
    pricing: {
      "shared account": { "1m": 45, "2m": 75, "3m": 105 }
    }
  },
  { 
    id: "loklok",
    name: "Loklok",
    category: "entertainment",
    icon: "📱",
    stock: 7,
    pricing: {
      "solo account": { "1m": 150 },
      "shared account": { "1m": 65, "2m": 115, "3m": 170 }
    }
  },
  { 
    id: "iqiyi",
    name: "iQiyi",
    category: "entertainment",
    icon: "📺",
    stock: 8,
    pricing: {
      "shared account": { "1m": 50, "2m": 90, "3m": 135 }
    }
  },
  { 
    id: "hbo-max",
    name: "HBO Max",
    category: "entertainment",
    icon: "📹",
    stock: 10,
    pricing: {
      "solo account": { "1m": 240, "2m": 360, "3m": 480 },
      "solo profile": { "1m": 135, "2m": 240, "3m": 350 },
      "shared profile": { "1m": 70, "2m": 120, "3m": 170 }
    }
  },
  { 
    id: "amazon-prime",
    name: "Amazon Prime",
    category: "entertainment",
    icon: "🛒",
    stock: 15,
    pricing: {
      "solo account": { "1m": 80, "2m": 110, "3m": 135, "4m": 160, "5m": 185, "6m": 210 },
      "solo profile": { "1m": 50, "2m": 80, "3m": 110, "4m": 135, "5m": 150, "6m": 170 },
      "shared profile": { "1m": 30, "2m": 50, "3m": 70, "4m": 80, "5m": 90, "6m": 100 }
    }
  },
  { 
    id: "youku",
    name: "Youku",
    category: "entertainment",
    icon: "📺",
    stock: 6,
    pricing: {
      "solo account": { "1m": 125 },
      "shared account": { "1m": 50, "2m": 90, "3m": 125 }
    }
  },
  { 
    id: "nba-league-pass",
    name: "NBA League Pass Premium",
    category: "entertainment",
    icon: "🏀",
    stock: 5,
    pricing: {
      "solo account": { "1m": 150 },
      "shared account": { "1m": 75 }
    }
  },

  // Streaming / Music
  { 
    id: "youtube",
    name: "YouTube Premium",
    category: "streaming",
    icon: "📹",
    stock: 20,
    pricing: {
      "famhead": { "1m": 70, "2m": 90, "3m": 125, "4m": 150, "5m": 175, "6m": 200 },
      "solo": { "1m": 45, "2m": 60, "3m": 85, "4m": 105, "5m": 125, "6m": 145 },
      "invite": { "1m": 20, "2m": 35, "3m": 50, "4m": 60, "5m": 70, "6m": 80 }
    }
  },
  { 
    id: "spotify",
    name: "Spotify Premium",
    category: "streaming",
    icon: "🎵",
    stock: 15,
    pricing: {
      "solo fw": { "1m": 60, "2m": 110, "3m": 150, "4m": 200 },
      "solo nw": { "1m": 45, "2m": 80, "3m": 120, "4m": 150 }
    }
  },
  { 
    id: "apple-music",
    name: "Apple Music",
    category: "streaming",
    icon: "🎧",
    stock: 12,
    pricing: {
      "solo account": { "1m": 49, "2m": 89, "3m": 129, "4m": 159 }
    }
  },

  // AI
  { 
    id: "chatgpt",
    name: "ChatGPT Plus",
    category: "ai",
    icon: "🧠",
    stock: 10,
    pricing: {
      "solo account": { "1m": 600, "2m": 1050, "3m": 1500 },
      "shared account": { "1m": 120, "2m": 200, "3m": 290 }
    }
  },
  { 
    id: "blackbox-ai",
    name: "Blackbox AI",
    category: "ai",
    icon: "🤖",
    stock: 0,
    pricing: {
      "solo account": { "1m": 90, "2m": 170, "3m": 250 }
    }
  },
  { 
    id: "perplexity",
    name: "Perplexity AI",
    category: "ai",
    icon: "🔍",
    stock: 8,
    pricing: {
      "solo account": { "1m": 120, "4m": 200, "6m": 250, "12m": 300, "24m": 450 },
      "shared account": { "1m": 55, "4m": 140, "6m": 190, "12m": 230, "24m": 350 }
    }
  },
  { 
    id: "google-one",
    name: "Google One + Gemini AI",
    category: "ai",
    icon: "☁️",
    stock: 10,
    pricing: {
      "solo account": { "1m": 50, "2m": 85, "3m": 120, "12m": 280 },
      "shared account": { "1m": 30, "2m": 50, "3m": 80, "12m": 150 }
    }
  },

  // Educational
  { 
    id: "quizlet",
    name: "Quizlet+",
    category: "educational",
    icon: "📚",
    stock: 6,
    pricing: {
      "solo account": { "1m": 45, "2m": 65, "3m": 100 },
      "shared account": { "1m": 20, "2m": 35, "3m": 50 }
    }
  },
  { 
    id: "scribd",
    name: "Scribd Premium",
    category: "educational",
    icon: "📖",
    stock: 7,
    pricing: {
      "solo account": { "1m": 50, "2m": 85, "3m": 120 },
      "shared account": { "1m": 30, "2m": 50, "3m": 80 }
    }
  },
  { 
    id: "studocu",
    name: "Studocu Premium",
    category: "educational",
    icon: "🎓",
    stock: 6,
    pricing: {
      "solo account": { "1m": 50, "2m": 85, "3m": 120 },
      "shared account": { "1m": 30, "2m": 50, "3m": 80 }
    }
  },
  { 
    id: "duolingo",
    name: "Duolingo Super",
    category: "educational",
    icon: "🧑‍🎓",
    stock: 6,
    pricing: {
      "solo account": { "1m": 80, "2m": 130, "3m": 170 }
    }
  },
  { 
    id: "turnitin-student",
    name: "Turnitin Student",
    category: "educational",
    icon: "📝",
    stock: 8,
    pricing: {
      "solo account": { "7d": 35, "14d": 50, "1m": 80, "2m": 140, "3m": 160, "6m": 330, "12m": 580 }
    }
  },
  { 
    id: "turnitin-instructor",
    name: "Turnitin Instructor",
    category: "educational",
    icon: "👨‍🏫",
    stock: 5,
    pricing: {
      "solo account": { "1m": 520 },
      "shared account": { "7d": 120, "14d": 175, "1m": 280 }
    }
  },
  { 
    id: "grammarly",
    name: "Grammarly Premium",
    category: "educational",
    icon: "✍️",
    stock: 8,
    pricing: {
      "solo account": { "1m": 85 },
      "shared account": { "1m": 35, "2m": 65, "3m": 95 }
    }
  },
  { 
    id: "quillbot",
    name: "Quillbot Premium",
    category: "educational",
    icon: "📝",
    stock: 8,
    pricing: {
      "solo account": { "1m": 100 },
      "shared account": { "1m": 45, "2m": 75, "3m": 110 }
    }
  },
  { 
    id: "ms-365",
    name: "Microsoft 365",
    category: "educational",
    icon: "💻",
    stock: 15,
    pricing: {
      "solo account": { "1m": 55, "2m": 90, "3m": 120 },
      "shared account": { "1m": 25, "2m": 45, "3m": 65 }
    }
  },
  { 
    id: "zoom",
    name: "Zoom Pro",
    category: "educational",
    icon: "📽️",
    stock: 6,
    pricing: {
      "solo account": { "14d": 45, "1m": 70, "2m": 120, "3m": 160 }
    }
  },

  // Editing
  { 
    id: "canva",
    name: "Canva Pro",
    category: "editing",
    icon: "🎨",
    stock: 25,
    pricing: {
      "edu lifetime": { "nw": 19, "3m w": 39, "6m w": 49, "12m w": 69 },
      "teamhead": { "1m": 45, "2m": 55, "3m": 65, "4m": 75, "5m": 85, "6m": 95 },
      "solo": { "1m": 25, "2m": 35, "3m": 45, "4m": 55, "5m": 65, "6m": 75 },
      "invite": { "1m": 10, "2m": 15, "3m": 20, "4m": 25, "5m": 30, "6m": 35 }
    }
  },
  { 
    id: "picsart",
    name: "Picsart Gold",
    category: "editing",
    icon: "👏",
    stock: 12,
    pricing: {
      "teamhead account": { "1m": 70, "2m": 115, "3m": 150 },
      "solo account": { "1m": 50, "2m": 85, "3m": 120 },
      "shared account": { "1m": 25, "2m": 45, "3m": 70 }
    }
  },
  { 
    id: "capcut",
    name: "CapCut Pro",
    category: "editing",
    icon: "📝",
    stock: 10,
    pricing: {
      "solo account": { "7d": 50, "1m": 130, "2m": 190, "3m": 240 },
      "shared account": { "1m": 70, "2m": 120, "3m": 155 }
    }
  },
  { 
    id: "alight-motion",
    name: "Alight Motion Pro",
    category: "editing",
    icon: "📱",
    stock: 8,
    pricing: {
      "solo account": { "1m": 90, "12m": 149 },
      "shared account": { "1m": 35, "12m": 69 }
    }
  },
  { 
    id: "remini",
    name: "Remini Web",
    category: "editing",
    icon: "✨",
    stock: 6,
    pricing: {
      "solo account": { "7d": 30, "1m": 50 },
      "shared account": { "7d": 15, "1m": 25 }
    }
  },
  { 
    id: "cams-canner",
    name: "CamScanner Pro",
    category: "editing",
    icon: "📁",
    stock: 8,
    pricing: {
      "solo account": { "1m": 100, "2m": 180, "3m": 250 },
      "shared account": { "1m": 50, "2m": 90, "3m": 120 }
    }
  },
  { 
    id: "small-pdf",
    name: "Small PDF Pro",
    category: "editing",
    icon: "📁",
    stock: 7,
    pricing: {
      "solo account": { "1m": 55, "2m": 95, "3m": 130 },
      "shared account": { "1m": 30, "2m": 50, "3m": 70 }
    }
  }
];

/* =========================================================
   DATA LOADING
   ========================================================= */

export async function fetchProducts(force = false) {
  if (!force && PRODUCTS_CACHE.length) return PRODUCTS_CACHE;

  USING_DEFAULT_PRODUCTS = false;

  try {
    const rows = await dbSelect(
      "products",
      "id,name,category,icon,stock,pricing,created_at,updated_at",
      (q) => q.order("name", { ascending: true })
    );

    if (rows && rows.length) {
      PRODUCTS_CACHE = rows;
      return PRODUCTS_CACHE;
    }
  } catch (err) {
    console.error("fetchProducts Supabase error:", err);
  }

  // Fallback kapag walang rows / may error
  USING_DEFAULT_PRODUCTS = true;
  PRODUCTS_CACHE = DEFAULT_PRODUCTS;
  return PRODUCTS_CACHE;
}

export function getProductById(id) {
  return PRODUCTS_CACHE.find((p) => p.id === id) || null;
}

// Used by Records module, etc.
export async function fillProductSelect(selectEl) {
  if (!selectEl) return;

  const products = await fetchProducts();

  if (!products.length) {
    selectEl.innerHTML = `<option value="">No products found</option>`;
    return;
  }

  selectEl.innerHTML =
    `<option value="">Select product</option>` +
    products
      .map(
        (p) =>
          `<option value="${p.id}">
            ${p.name} (${p.category})
          </option>`
      )
      .join("");
}

/* =========================================================
   PRODUCTS LIST PANEL
   ========================================================= */

export async function initProductsModule() {
  const main = document.getElementById("admin-main");
  if (!main) return;

  main.innerHTML = `
    <section class="admin-section">
      <div class="admin-section-head">
        <div>
          <h2 class="admin-title">Products List</h2>
          <p class="admin-subtitle">
            Products loaded from Supabase <code>products</code> table.
            If the table is empty, the built-in default product list will be used.
          </p>
        </div>
        <button id="btn-refresh-products" class="btn btn-secondary btn-sm">
          Refresh
        </button>
      </div>

      <div id="products-list" class="admin-card-list"></div>
    </section>
  `;

  document
    .getElementById("btn-refresh-products")
    ?.addEventListener("click", async () => {
      await fetchProducts(true);
      await renderProductsList();
      showToast("Products refreshed.", "success");
    });

  await renderProductsList();
}

async function renderProductsList() {
  const listEl = document.getElementById("products-list");
  if (!listEl) return;

  const products = await fetchProducts();

  if (!products.length) {
    listEl.innerHTML = `
      <div class="admin-empty">
        <p>No products found.</p>
      </div>
    `;
    return;
  }

  const banner = USING_DEFAULT_PRODUCTS
    ? `<div class="alert alert-warning mb-3">
         Using built-in default products (database returned no rows).
       </div>`
    : "";

  listEl.innerHTML =
    banner + products.map((p) => renderProductCard(p)).join("");
}

function renderProductCard(p) {
  const pricing = p.pricing || {};
  const pricingHtml =
    Object.keys(pricing).length === 0
      ? `<em class="text-muted">No pricing set</em>`
      : Object.entries(pricing)
          .map(([accountType, durations]) => {
            const prices = Object.entries(durations)
              .map(([dur, price]) => {
                const label = durationMap[dur] || dur;
                return `${label}: ₱${price}`;
              })
              .join(", ");

            return `
              <div class="product-price-row">
                <strong>${accountType}</strong>
                <span>— ${prices}</span>
              </div>
            `;
          })
          .join("");

  return `
    <article class="admin-card">
      <header class="admin-card-header">
        <div class="admin-card-title">
          <span class="admin-card-icon">${p.icon || "🛒"}</span>
          <div>
            <div class="admin-card-name">${p.name}</div>
            <div class="admin-card-meta">
              ID: <code>${p.id}</code> • ${p.category}
            </div>
          </div>
        </div>
        <div class="admin-card-badge">
          Stock: ${p.stock ?? 0}
        </div>
      </header>

      <div class="admin-card-body">
        ${pricingHtml}
      </div>
    </article>
  `;
}