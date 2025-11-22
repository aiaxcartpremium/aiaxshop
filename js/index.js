// ===============================
// index.js — Buyer Side Logic
// ===============================

// Supabase init
const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===============================
// DOM ELEMENTS
// ===============================

const sectionProducts = document.getElementById("panel-products");
const sectionOrders = document.getElementById("panel-orders");
const sectionDelivered = document.getElementById("panel-delivered");
const sectionRules = document.getElementById("panel-rules");
const sectionFeedback = document.getElementById("panel-feedback");
const sectionLogin = document.getElementById("panel-login");

const productsList = document.getElementById("products-list");
const rulesBody = document.getElementById("rules-body");
const feedbackBody = document.getElementById("feedback-body");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const tabProducts = document.getElementById("tab-products");
const tabOrders = document.getElementById("tab-orders");
const tabDelivered = document.getElementById("tab-delivered");
const tabRules = document.getElementById("tab-rules");
const tabFeedback = document.getElementById("tab-feedback");
const tabLogin = document.getElementById("tab-login");

// ===============================
// TAB SWITCHING
// ===============================

function showPanel(panel) {
  document.querySelectorAll(".section-panel").forEach((sec) => sec.classList.remove("active"));
  panel.classList.add("active");

  document.querySelectorAll(".tabs-nav a").forEach((el) => el.classList.remove("active"));
}

tabProducts.onclick = () => {
  showPanel(sectionProducts);
  tabProducts.classList.add("active");
  loadProducts();
};

tabOrders.onclick = () => {
  showPanel(sectionOrders);
  tabOrders.classList.add("active");
  loadOrders();
};

tabDelivered.onclick = () => {
  showPanel(sectionDelivered);
  tabDelivered.classList.add("active");
  loadDelivered();
};

tabRules.onclick = () => {
  showPanel(sectionRules);
  tabRules.classList.add("active");
  loadRules();
};

tabFeedback.onclick = () => {
  showPanel(sectionFeedback);
  tabFeedback.classList.add("active");
  loadFeedback();
};

tabLogin.onclick = () => {
  showPanel(sectionLogin);
  tabLogin.classList.add("active");
};

// ===============================
// AUTH STATUS
// ===============================

async function checkAuth() {
  const { data } = await sb.auth.getSession();
  const session = data.session;

  if (session?.user) {
    btnLogout.classList.remove("d-none");
    btnLogin.classList.add("d-none");
    tabLogin.textContent = session.user.email;
  } else {
    btnLogout.classList.add("d-none");
    btnLogin.classList.remove("d-none");
    tabLogin.textContent = "Login";
  }
}

btnLogin.onclick = async () => {
  await sb.auth.signInWithOAuth({ provider: "google" });
};

btnLogout.onclick = async () => {
  await sb.auth.signOut();
  location.reload();
};

// ===============================
// LOAD PRODUCTS
// ===============================

async function loadProducts() {
  productsList.innerHTML =
    `<div class="text-center text-muted py-3">Loading products...</div>`;

  const tplCard = document.getElementById("tpl-product-card");
  const tplPlan = document.getElementById("tpl-plan-item");

  const { data: products, error } = await sb
    .from("products")
    .select("*")
    .order("name", { ascending: true });

  if (!products || error) {
    productsList.innerHTML =
      `<div class="text-danger text-center py-3">Failed to load products.</div>`;
    return;
  }

  productsList.innerHTML = "";

  for (const p of products) {
    // STOCK COUNT
    const { data: stockRows } = await sb
      .from("stocks")
      .select("quantity")
      .eq("product_id", p.id)
      .eq("status", "available");

    const totalStock = stockRows?.reduce((s, v) => s + (v.quantity || 0), 0) || 0;

    // PRICE PLANS
    const { data: plans } = await sb
      .from("product_prices")
      .select("*")
      .eq("product_id", p.id)
      .order("price");

    // Clone template
    const card = tplCard.content.cloneNode(true);
    card.querySelector(".product-title").textContent = p.name;
    card.querySelector(".product-category").textContent = p.category;
    card.querySelector(".product-stock").textContent =
      totalStock > 0 ? `In Stock (${totalStock})` : "Out of Stock";

    const expandBtn = card.querySelector(".btn-expand-plans");
    const plansBox = card.querySelector(".plans-box");
    const plansInner = card.querySelector(".plans-inner");

    expandBtn.onclick = () => {
      plansBox.style.display = plansBox.style.display === "none" ? "block" : "none";
    };

    if (!plans?.length) {
      plansInner.innerHTML = `<div class="text-muted small">No plans yet.</div>`;
    } else {
      plansInner.innerHTML = "";
      plans.forEach((pp) => {
        const row = tplPlan.content.cloneNode(true);

        row.querySelector(".plan-type").textContent = pp.account_type;
        row.querySelector(".plan-duration").textContent = pp.duration;
        row.querySelector(".plan-price").textContent = `₱${pp.price}`;

        const btn = row.querySelector(".plan-item");
        btn.onclick = () => openCheckout(p, pp);

        if (totalStock <= 0) btn.disabled = true;

        plansInner.appendChild(row);
      });
    }

    productsList.appendChild(card);
  }
}

// ===============================
// CHECKOUT MODAL
// ===============================

const coProduct = document.getElementById("co-product");
const coType = document.getElementById("co-type");
const coPlan = document.getElementById("co-plan");
const coPrice = document.getElementById("co-price");
const coEmail = document.getElementById("co-email");
const coProof = document.getElementById("co-proof");
const coPreview = document.getElementById("co-proof-preview");

let CURRENT_ORDER = null;

function openCheckout(product, plan) {
  CURRENT_ORDER = { product, plan };

  coProduct.textContent = product.name;
  coType.textContent = plan.account_type;
  coPlan.textContent = plan.duration;
  coPrice.textContent = `₱${plan.price}`;

  coPreview.style.display = "none";
  coProof.value = "";
  coEmail.value = "";

  new bootstrap.Modal(document.getElementById("modalCheckout")).show();
}

coProof.onchange = () => {
  const file = coProof.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  coPreview.src = url;
  coPreview.style.display = "block";
};

// ===============================
// SUBMIT ORDER
// ===============================

document.getElementById("btnSubmitOrder").onclick = async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) return alert("Please log in first.");

  const buyerEmail = data.session.user.email;
  const file = coProof.files[0];

  let proofUrl = null;

  if (file) {
    const fileName = `proof_${Date.now()}.jpg`;
    const { data: uploaded, error: uploadErr } = await sb.storage
      .from("proofs")
      .upload(fileName, file);

    if (!uploadErr) {
      proofUrl =
        `https://hnymqvkfmythdxtjqeam.supabase.co/storage/v1/object/public/proofs/${fileName}`;
    }
  }

  const { error } = await sb.from("orders").insert([
    {
      buyer_email: buyerEmail,
      product_id: CURRENT_ORDER.product.id,
      account_type: CURRENT_ORDER.plan.account_type,
      duration: CURRENT_ORDER.plan.duration,
      price: CURRENT_ORDER.plan.price,
      proof_image_url: proofUrl,
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    alert("Order failed.");
    console.error(error);
  } else {
    alert("Order submitted! Wait for admin confirmation.");
    loadOrders();
  }
};

// ===============================
// LOAD ORDERS
// ===============================

async function loadOrders() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return;

  const email = data.session.user.email;
  const list = document.getElementById("orders-list");

  const { data: orders } = await sb
    .from("orders")
    .select("*")
    .eq("buyer_email", email)
    .order("created_at", { ascending: false });

  if (!orders?.length) {
    list.innerHTML = `<div class="text-muted">No orders yet.</div>`;
    return;
  }

  list.innerHTML = orders
    .map(
      (o) => `
      <div class="border rounded p-2 mb-2">
        <div><strong>${o.product_id}</strong></div>
        <div>${o.account_type} — ${o.duration}</div>
        <div>₱${o.price}</div>
        <span class="badge bg-warning">${o.status}</span>
      </div>
    `
    )
    .join("");
}

// ===============================
// LOAD DELIVERED ACCOUNTS
// ===============================

async function loadDelivered() {
  const { data } = await sb.auth.getSession();
  if (!data.session) return;

  const email = data.session.user.email;
  const list = document.getElementById("delivered-list");

  const { data: delivered } = await sb
    .from("records")
    .select("*")
    .eq("buyer", email)
    .order("purchase_date", { ascending: false });

  if (!delivered?.length) {
    list.innerHTML = `<div class="text-muted">No delivered accounts yet.</div>`;
    return;
  }

  list.innerHTML = delivered
    .map(
      (r) => `
      <div class="border rounded p-2 mb-2">
        <strong>${r.product_id}</strong><br>
        ${r.account_type} (${r.duration})<br>
        Email: <b>${r.account_email}</b><br>
        Pass: <b>${r.account_password}</b><br>
        Profile: ${r.profile || "-"}<br>
        <small class="text-muted">Purchased: ${r.purchase_date}<br>
        Expiry: ${r.expiry_date}</small>
      </div>
    `
    )
    .join("");
}

// ===============================
// RULES
// ===============================

async function loadRules() {
  const { data: rules } = await sb
    .from("rules")
    .select("*")
    .order("created_at", { ascending: false });

  rulesBody.innerHTML =
    rules?.map((r) => `<div class="mb-2 small">• ${r.body}</div>`).join("") ||
    `<div class="text-muted">No rules yet.</div>`;
}

// ===============================
// FEEDBACK (Placeholder)
// ===============================

function loadFeedback() {
  feedbackBody.innerHTML = `
    <div class="text-center text-muted">
      You can send feedback on Messenger or TikTok page.
    </div>
  `;
}

// ===============================
// INIT
// ===============================

checkAuth();
loadProducts();