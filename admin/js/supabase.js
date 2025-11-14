/* ============================================================
   supabase.js — Dedicated DB + Auth Layer for Admin System
   Aiaxcart Premium Shop — STRICT ADMIN SECURITY (Version A)
   ============================================================ */

import { showToast } from "./utils.js";

/* -------------------------------------------------------------
   1. INITIALIZE SUPABASE CLIENT
------------------------------------------------------------- */

export const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
export const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);


/* -------------------------------------------------------------
   2. AUTH HELPERS
------------------------------------------------------------- */

/**
 * Returns the current authenticated user (or null)
 */
export async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
}


/**
 * Logs the user out completely
 */
export async function logoutAdmin() {
    await supabase.auth.signOut();
    showToast("You have been logged out", "warning");
    setTimeout(() => (window.location.href = "/index.html"), 700);
}


/* -------------------------------------------------------------
   3. STRICT ADMIN VERIFICATION
------------------------------------------------------------- */

/**
 * Validates if current user is an admin
 * - Checks Supabase session
 * - Checks admin_uids table
 * - Rejects unauthorized users
 */
export async function verifyAdminAccess() {
    const user = await getCurrentUser();

    if (!user) {
        showToast("Please log in first.", "error");
        setTimeout(() => (window.location.href = "/index.html"), 800);
        return false;
    }

    // Check database for admin UID
    const { data, error } = await supabase
        .from("admin_uids")
        .select("uid")
        .eq("uid", user.id)
        .single();

    if (error || !data) {
        showToast("Unauthorized access. Admin only.", "error");
        await logoutAdmin();
        return false;
    }

    return true;
}


/* -------------------------------------------------------------
   4. DATABASE HELPERS (Reusable for ALL modules)
------------------------------------------------------------- */

/**
 * Safe select wrapper
 */
export async function dbSelect(table, options = {}) {
    const query = supabase.from(table).select(options.columns || "*");

    if (options.match) query.match(options.match);
    if (options.eq) query.eq(options.eq.column, options.eq.value);
    if (options.order) query.order(options.order.column, { ascending: options.order.asc });

    const { data, error } = await query;

    if (error) {
        console.error(`SELECT ERROR [${table}]:`, error);
        showToast(`Database error: ${error.message}`, "error");
        return null;
    }

    return data;
}

/**
 * Insert helper
 */
export async function dbInsert(table, payload) {
    const { data, error } = await supabase.from(table).insert(payload);

    if (error) {
        console.error(`INSERT ERROR [${table}]:`, error);
        showToast(`Insert error: ${error.message}`, "error");
        return null;
    }

    return data;
}

/**
 * Update helper
 */
export async function dbUpdate(table, match, payload) {
    const { data, error } = await supabase.from(table).update(payload).match(match);

    if (error) {
        console.error(`UPDATE ERROR [${table}]:`, error);
        showToast(`Update error: ${error.message}`, "error");
        return null;
    }

    return data;
}

/**
 * Delete helper
 */
export async function dbDelete(table, match) {
    const { data, error } = await supabase.from(table).delete().match(match);

    if (error) {
        console.error(`DELETE ERROR [${table}]:`, error);
        showToast(`Delete error: ${error.message}`, "error");
        return null;
    }

    return data;
}


/* -------------------------------------------------------------
   5. REALTIME FEATURES (future)
------------------------------------------------------------- */

// Placeholder — future upgrade:
// export function enableRealtime(table, callback) {
//     supabase
//         .channel(`realtime:${table}`)
//         .on("postgres_changes", { event: "*", schema: "public", table }, callback)
//         .subscribe();
// }


/* -------------------------------------------------------------
   6. Ensure modules wait for session to settle before loading
------------------------------------------------------------- */

export async function ensureAdminSession() {
    const ok = await verifyAdminAccess();
    if (!ok) return false;

    return true;
}
