// ================================
//  SUPABASE INITIALIZATION
// ================================

export const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
export const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

export const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
//  ADMIN AUTH SECURITY
// ================================

// Local fallback while not using Supabase Auth
export const ADMIN_ALLOW_UIDS = [
    "767e5f7d-0c7a-4c32-80e3-b9613e0d37df"
];

// Check in database admin_uids
export async function isAdmin(uid) {
    if (!uid) return false;
    if (!ADMIN_ALLOW_UIDS.includes(uid)) return false;

    const { data, error } = await db
        .from("admin_uids")
        .select("uid")
        .eq("uid", uid)
        .maybeSingle();

    if (error) {
        console.error("Admin verification DB error:", error);
        return false;
    }

    return !!data;
}

// ================================
//  GENERIC DATABASE FUNCTIONS
// ================================

// GET ALL rows from a table
export async function fetchTable(table) {
    const { data, error } = await db.from(table).select("*");
    if (error) {
        console.error(`Error loading ${table}:`, error);
        return [];
    }
    return data;
}

// INSERT row to a table
export async function insertRow(table, row) {
    const { data, error } = await db.from(table).insert(row).select().single();
    if (error) {
        console.error(`Insert error (${table}):`, error);
        return null;
    }
    return data;
}

// UPDATE row
export async function updateRow(table, match, changes) {
    const { data, error } = await db
        .from(table)
        .update(changes)
        .match(match)
        .select()
        .single();

    if (error) {
        console.error(`Update error (${table}):`, error);
        return null;
    }
    return data;
}

// DELETE row
export async function deleteRow(table, match) {
    const { error } = await db
        .from(table)
        .delete()
        .match(match);

    if (error) {
        console.error(`Delete error (${table}):`, error);
        return false;
    }
    return true;
}
