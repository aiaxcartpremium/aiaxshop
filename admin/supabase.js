// ==========================================
// supabase.js — SUPABASE WRAPPER UTILITIES
// ==========================================

import { showToast } from "./utils.js";

// Your credentials
const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

// Create client
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ==========================================
// BASIC CRUD WRAPPERS
// ==========================================

// Fetch all rows from a table
export async function fetchTable(table) {
    const { data, error } = await supabase
        .from(table)
        .select("*");

    if (error) {
        console.error(error);
        showToast("Error loading from " + table, "danger");
        return [];
    }
    return data || [];
}

// Insert row
export async function insertRow(table, row) {
    const { error } = await supabase
        .from(table)
        .insert([row]);

    if (error) {
        console.error(error);
        showToast("Insert error (" + table + ")", "danger");
        return false;
    }
    return true;
}

// Update row
export async function updateRow(table, match, updates) {
    const { error } = await supabase
        .from(table)
        .update(updates)
        .match(match);

    if (error) {
        console.error(error);
        showToast("Update error (" + table + ")", "danger");
        return false;
    }
    return true;
}

// Delete row
export async function deleteRow(table, match) {
    const { error } = await supabase
        .from(table)
        .delete()
        .match(match);

    if (error) {
        console.error(error);
        showToast("Delete error (" + table + ")", "danger");
        return false;
    }
    return true;
}

// ==========================================
// ADMIN CHECKER
// ==========================================
export async function isAdmin(uid) {
    const { data, error } = await supabase
        .from("admin_uids")
        .select("uid")
        .eq("uid", uid)
        .maybeSingle();

    if (error) {
        console.error(error);
        return false;
    }

    return data ? true : false;
}
