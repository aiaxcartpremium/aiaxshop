/* ================================
   BUYER SITE ENGINE (index.js)
================================ */

const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const elProducts = document.getElementById("product-list");
const tplProduct = document.getElementById("tpl-product-card");
const tplPlan = document.getElementById("tpl-plan-item");
const modalCheckout = new bootstrap.Modal(document.getElementById("modalCheckout"));

/* ======================================================
   LOGIN SYSTEM
====================================================== */
const loginBtn = document.getElementById("btnLogin");
const logoutBtn = document.getElementById("btnLogout");
const loggedEmail = document.getElementById("loggedEmail");

function checkSession() {
  const email = localStorage.getItem("buyer_email");

  if (email) {
    loggedEmail.textContent = email;
    loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
  } else {
    loggedEmail.textContent = "";
    loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
  }
}

loginBtn?.addEventListener("click", async () => {
  const email = prompt("Enter your email to login:");
  if (!email) return;

  localStorage.setItem("buyer_email", email.trim());
  checkSession();
});

logoutBtn?.addEventListener("click", () => {
  localStorage.removeItem("buyer_email");
  checkSession();
});

/* ======================================================
   LOAD PRODUCTS
====================================================== */
async function loadProducts() {
  elProducts.innerHTML = `<p class="text-center text-muted">Loading products…</p>`;

  const { data: products } = await sb.from("products").select("*").order("name");

  const { data: prices } = await sb.from("product_prices").select("*");

  elProducts.innerHTML = "";

  products.forEach((p) => {
    const card = tplProduct.content.cloneNode(true);

    card.querySelector(".product-title").textContent = p.name;
    card.querySelector(".product-category").textContent = p.category;

    card.querySelector(".product-stock").textContent = "Showing available plans…";

    const btnExpand = card.querySelector(".btn-expand-plans");
    const plansBox = card.querySelector(".plans-box");
    const plansInner = card.querySelector(".plans-inner");

    btnExpand.addEventListener("click", () => {
      plansBox.style.display = plansBox.style.display === "none" ? "block" : "none";
    });

    const prodPlans = prices.filter((x) => x.product_id === p.id);

    if (!prodPlans.length) {
      plansInner.innerHTML = `<p class="text-muted small">No pricing yet.</p>`;
    } else {
      prodPlans.forEach((pr) => {
        const planEl = tplPlan.content.cloneNode(true);
        planEl.querySelector(".plan-type").textContent = pr.account_type;
        planEl.querySelector(".plan-duration").textContent = pr.duration;
        planEl.querySelector(".plan-price").textContent = "₱" + pr.price.toFixed(2);

        planEl.querySelector(".plan-item").addEventListener("click", () => {
          openCheckoutModal(p, pr);
        });

        plansInner.appendChild(planEl);
      });
    }

    elProducts.appendChild(card);
  });
}

/* ======================================================
   CHECKOUT MODAL HANDLER
====================================================== */
let CURRENT_ORDER = null;

function openCheckoutModal(product, plan) {
  const buyerEmail = localStorage.getItem("buyer_email");

  CURRENT_ORDER = { product, plan };

  document.getElementById("co-product").textContent = product.name;
  document.getElementById("co-type").textContent = plan.account_type;
  document.getElementById("co-plan").textContent = plan.duration;
  document.getElementById("co-price").textContent = "₱" + plan.price.toFixed(2);

  if (buyerEmail) {
    document.getElementById("co-email").value = buyerEmail;
  }

  document.getElementById("co-proof-preview").style.display = "none";

  modalCheckout.show();
}

/* ======================================================
   PROOF IMAGE PREVIEW
====================================================== */
document.getElementById("co-proof").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  const prev = document.getElementById("co-proof-preview");

  prev.src = url;
  prev.style.display = "block";
});

/* ======================================================
   SUBMIT ORDER
====================================================== */
document.getElementById("btnSubmitOrder").addEventListener("click", submitOrder);

async function submitOrder() {
  if (!CURRENT_ORDER) return;

  const email = document.getElementById("co-email").value.trim();
  const fileInput = document.getElementById("co-proof");
  const file = fileInput.files[0];

  if (!email) return alert("Enter your email.");
  if (!file) return alert("Upload a proof image.");

  // Upload Image First
  const fileName = `proof_${Date.now()}.jpg`;

  const { data: img, error: imgErr } = await sb.storage
    .from("proofs")
    .upload(fileName, file, { upsert: false });

  if (imgErr) {
    console.error(imgErr);
    return alert("Upload error.");
  }

  const { data: urlData } = sb.storage.from("proofs").getPublicUrl(fileName);
  const proofUrl = urlData.publicUrl;

  // Insert order
  const { error } = await sb.from("orders").insert({
    buyer_email: email,
    product_id: CURRENT_ORDER.product.id,
    account_type: CURRENT_ORDER.plan.account_type,
    duration: CURRENT_ORDER.plan.duration,
    price: CURRENT_ORDER.plan.price,
    status: "pending",
    proof_image_url: proofUrl,
    reference_number: "N/A",
  });

  if (error) {
    console.error(error);
    return alert("Order failed.");
  }

  alert("Order submitted! Wait for admin approval.");

  modalCheckout.hide();
}

/* ======================================================
   INIT
====================================================== */

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
  loadProducts();
});