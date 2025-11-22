/**************************************************
 * Aiaxcart Buyer Script (FINAL VERSION)
 * Fully matched with your current index.html
 **************************************************/

// ========================
// Supabase Init
// ========================
const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========================
// DOM Elements
// ========================
const panelProducts = document.getElementById("panel-products");
const panelOrders = document.getElementById("panel-orders");
const panelDelivered = document.getElementById("panel-delivered");
const panelRules = document.getElementById("panel-rules");
const panelFeedback = document.getElementById("panel-feedback");
const panelLogin = document.getElementById("panel-login");

const listProducts = document.getElementById("products-list");
const listOrders = document.getElementById("orders-list");
const listDelivered = document.getElementById("delivered-list");
const rulesBody = document.getElementById("rules-body");
const feedbackBody = document.getElementById("feedback-body");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");

const tplProductCard = document.getElementById("tpl-product-card");
const tplPlanItem = document.getElementById("tpl-plan-item");

// Checkout modal
const modalCheckout = new bootstrap.Modal(document.getElementById("modalCheckout"));
const coProduct = document.getElementById("co-product");
const coType = document.getElementById("co-type");
const coPlan = document.getElementById("co-plan");
const coPrice = document.getElementById("co-price");
const coEmail = document.getElementById("co-email");
const coProof = document.getElementById("co-proof");
const coProofPreview = document.getElementById("co-proof-preview");
const btnSubmitOrder = document.getElementById("btnSubmitOrder");

// ========================
// TABS HANDLER
// ========================
function showPanel(id) {
  document.querySelectorAll(".section-panel").forEach((p) => p.classList.remove("active"));
  document.querySelector(`#panel-${id}`).classList.add("active");

  document.querySelectorAll(".tabs-nav a").forEach((t) => t.classList.remove("active"));
  document.getElementById(`tab-${id}`).classList.add("active");

  if (id === "products") loadProducts();
  if (id === "orders") loadOrders();
  if (id === "delivered") loadDelivered();
  if (id === "rules") loadRules();
  if (id === "feedback") loadFeedback();
}

document.getElementById("tab-products").onclick = () => showPanel("products");
document.getElementById("tab-orders").onclick = () => showPanel("orders");
document.getElementById("tab-delivered").onclick = () => showPanel("delivered");
document.getElementById("tab-rules").onclick = () => showPanel("rules");
document.getElementById("tab-feedback").onclick = () => showPanel("feedback");
document.getElementById("tab-login").onclick = () => showPanel("login");

// ========================
// AUTH HANDLING
// ========================
async function checkAuth() {
  const { data } = await sb.auth.getSession();
  const session = data?.session;

  if (session?.user) {
    btnLogin.classList.add("d-none");
    btnLogout.classList.remove("d-none");
    document.getElementById("tab-login").textContent = session.user.email;
  } else {
    btnLogin.classList.remove("d-none");
    btnLogout.classList.add("d-none");
    document.getElementById("tab-login").textContent = "Login";
  }
}

btnLogin.onclick = async () => {
  await sb.auth.signInWithOAuth({ provider: "google" });
};

btnLogout.onclick = async () => {
  await sb.auth.signOut();
  location.reload();
};

// ========================
// LOAD PRODUCTS
// ========================
async function loadProducts() {
  listProducts.innerHTML = `<div class="text-muted text-center p-3">Loading…</div>`;

  const { data: products } = await sb.from("products").select("*");

  if (!products || !products.length) {
    listProducts.innerHTML = `<div class="text-muted text-center p-3">No products available.</div>`;
    return;
  }

  listProducts.innerHTML = "";

  for (let p of products) {
    const card = tplProductCard.content.cloneNode(true);
    card.querySelector(".product-title").textContent = p.name;
    card.querySelector(".product-category").textContent = p.category;

    // STOCK CHECK
    const { data: stockRows } = await sb
      .from("stocks")
      .select("quantity")
      .eq("product_id", p.id)
      .eq("status", "available");

    const totalStock =
      stockRows?.reduce((sum, s) => sum + (s.quantity || 0), 0) || 0;

    card.querySelector(".product-stock").textContent =
      totalStock > 0 ? `Stock: ${totalStock}` : `Out of Stock`;

    // LOAD PLANS
    const { data: plans } = await sb
      .from("product_prices")
      .select("*")
      .eq("product_id", p.id)
      .order("price", { ascending: true });

    const plansBox = card.querySelector(".plans-box");
    const btnExpand = card.querySelector(".btn-expand-plans");
    const container = card.querySelector(".plans-inner");

    btnExpand.onclick = () => {
      plansBox.style.display = plansBox.style.display === "none" ? "block" : "none";
    };

    if (plans?.length) {
      plans.forEach((pp) => {
        const item = tplPlanItem.content.cloneNode(true);

        item.querySelector(".plan-type").textContent = pp.account_type;
        item.querySelector(".plan-duration").textContent = pp.duration;
        item.querySelector(".plan-price").textContent = `₱${pp.price}`;

        item.querySelector(".plan-item").onclick = () => {
          openCheckout(p, pp, totalStock);
        };

        container.appendChild(item);
      });
    } else {
      container.innerHTML = `<div class="text-muted small">No plans available.</div>`;
    }

    listProducts.appendChild(card);
  }
}

// ========================
// CHECKOUT MODAL
// ========================
let selectedProduct = null;
let selectedPlan = null;

function openCheckout(product, plan, stock) {
  if (stock <= 0) {
    alert("Out of stock.");
    return;
  }

  selectedProduct = product;
  selectedPlan = plan;

  coProduct.textContent = product.name;
  coType.textContent = plan.account_type;
  coPlan.textContent = plan.duration;
  coPrice.textContent = `₱${plan.price}`;

  coProof.value = "";
  coProofPreview.style.display = "none";

  modalCheckout.show();
}

coProof.onchange = () => {
  const file = coProof.files[0];
  if (file) {
    coProofPreview.src = URL.createObjectURL(file);
    coProofPreview.style.display = "block";
  }
};

// ========================
// SUBMIT ORDER
// ========================
btnSubmitOrder.onclick = async () => {
  const {
    data: { session },
  } = await sb.auth.getSession();

  if (!session) return alert("Please login first.");

  const buyer = session.user.email;

  // Upload image
  let proofURL = null;
  if (coProof.files.length > 0) {
    const file = coProof.files[0];
    const filePath = `proofs/${Date.now()}_${file.name}`;

    let { data, error } = await sb.storage
      .from("proofs")
      .upload(filePath, file);

    if (error) {
      console.error(error);
      return alert("Failed to upload proof.");
    }

    const { data: publicURL } = sb.storage.from("proofs").getPublicUrl(filePath);
    proofURL = publicURL.publicUrl;
  }

  // Insert order
  const { error } = await sb.from("orders").insert([
    {
      buyer_email: buyer,
      product_id: selectedProduct.id,
      account_type: selectedPlan.account_type,
      duration: selectedPlan.duration,
      price: selectedPlan.price,
      status: "pending",
      proof_image: proofURL,
      created_at: new Date().toISOString(),
    },
  ]);

  if (error) {
    console.error(error);
    alert("Order failed.");
  } else {
    alert("Order placed!");
    modalCheckout.hide();
    showPanel("orders");
  }
};

// ========================
// LOAD ORDERS
// ========================
async function loadOrders() {
  const { data: session } = await sb.auth.getSession();
  if (!session?.session) return;

  const email = session.session.user.email;

  listOrders.innerHTML = `<div class="text-muted text-center p-3">Loading…</div>`;

  const { data: orders } = await sb
    .from("orders")
    .select("*")
    .eq("buyer_email", email)
    .order("created_at", { ascending: false });

  if (!orders || !orders.length) {
    listOrders.innerHTML = `<div class="text-center text-muted p-3">No orders yet.</div>`;
    return;
  }

  let html = "";
  orders.forEach((o) => {
    html += `
    <div class="border rounded p-2 mb-2">
      <div><strong>${o.product_id}</strong></div>
      <div>${o.account_type} • ${o.duration}</div>
      <div class="text-primary fw-bold">₱${o.price}</div>
      <div>Status: <span class="badge bg-warning">${o.status}</span></div>
      <div class="small text-muted">
        ${new Date(o.created_at).toLocaleString()}
      </div>
    </div>`;
  });

  listOrders.innerHTML = html;
}

// ========================
// LOAD DELIVERED ACCOUNTS
// ========================
async function loadDelivered() {
  const { data: session } = await sb.auth.getSession();
  if (!session?.session) return;

  const email = session.session.user.email;

  listDelivered.innerHTML = `<div class="text-muted text-center p-3">Loading…</div>`;

  const { data: rec } = await sb
    .from("records")
    .select("*")
    .eq("buyer", email)
    .order("purchase_date", { ascending: false });

  if (!rec?.length) {
    listDelivered.innerHTML = `<div class="text-center text-muted p-3">No delivered accounts yet.</div>`;
    return;
  }

  let html = "";
  rec.forEach((r) => {
    html += `
    <div class="border rounded p-2 mb-2">
      <strong>${r.product_id}</strong><br>
      ${r.account_type} • ${r.duration}<br>
      Email: <strong>${r.account_email}</strong><br>
      Pass: <strong>${r.account_password}</strong><br>
      Profile: ${r.profile || "-"}<br>
      <div class="small text-muted">
        Purchased: ${new Date(r.purchase_date).toLocaleDateString()}<br>
        Expiry: ${new Date(r.expiry_date).toLocaleDateString()}
      </div>
    </div>`;
  });

  listDelivered.innerHTML = html;
}

// ========================
// LOAD RULES
// ========================
async function loadRules() {
  const { data } = await sb.from("rules").select("*");
  rulesBody.innerHTML = data?.map((r) => `<p>• ${r.text}</p>`).join("") || "No rules.";
}

// ========================
// LOAD FEEDBACK
// ========================
async function loadFeedback() {
  const { data } = await sb.from("feedback").select("*");
  feedbackBody.innerHTML =
    data?.map((f) => `<p>⭐ ${f.rating} — ${f.comment}</p>`).join("") ||
    "No feedback yet.";
}

// ========================
// INIT
// ========================
checkAuth();
loadProducts();