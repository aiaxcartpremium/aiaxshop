// admin/js/supabase.js
// Central Supabase client + small helpers (dbSelect, dbInsert, dbUpdate)

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// ⛔ PALITAN MO ITO NG TOTOONG VALUES MO
const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Simple wrapper for SELECT
export async function dbSelect(table, columns = "*", filters = {}) {
  let query = supabase.from(table).select(columns);

  // optional filters: { status: 'pending', buyer_id: 1, ... }
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  const { data, error } = await query;
  if (error) {
    console.error(`[dbSelect] Error selecting from ${table}:`, error);
    throw error;
  }
  return data || [];
}

// INSERT helper
export async function dbInsert(table, values) {
  const { data, error } = await supabase.from(table).insert(values).select();
  if (error) {
    console.error(`[dbInsert] Error inserting into ${table}:`, error);
    throw error;
  }
  return data || [];
}

// UPDATE helper
// matchObj = { id: 'order-id-here' }
export async function dbUpdate(table, values, matchObj = {}) {
  let query = supabase.from(table).update(values);
  Object.entries(matchObj).forEach(([key, val]) => {
    query = query.eq(key, val);
  });

  const { data, error } = await query.select();
  if (error) {
    console.error(`[dbUpdate] Error updating ${table}:`, error);
    throw error;
  }
  return data || [];
}
