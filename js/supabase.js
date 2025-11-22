// ================================
// supabase.js — Shared Client
// ================================

export const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ================================
// QUERY HELPERS
// ================================

// auto-apply match conditions
function applyMatch(q, match) {
  if (!match) return q;
  for (const [key, value] of Object.entries(match)) {
    if (value === null) q = q.is(key, null);
    else q = q.eq(key, value);
  }
  return q;
}

// SELECT
export async function dbSelect(table, columns = "*", match = null) {
  try {
    let q = sb.from(table).select(columns);
    q = applyMatch(q, match);

    const { data, error } = await q;
    if (error) throw error;

    return data || [];
  } catch (err) {
    console.error(`[dbSelect] ${table}`, err);
    return [];
  }
}

// INSERT
export async function dbInsert(table, payload) {
  try {
    const { data, error } = await sb.from(table).insert(payload).select();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`[dbInsert] ${table}`, err);
    throw err;
  }
}

// UPDATE
export async function dbUpdate(table, match, payload) {
  try {
    let q = sb.from(table).update(payload);
    q = applyMatch(q, match);

    const { data, error } = await q.select();
    if (error) throw error;

    return data;
  } catch (err) {
    console.error(`[dbUpdate] ${table}`, err);
    throw err;
  }
}

// DELETE
export async function dbDelete(table, match) {
  try {
    let q = sb.from(table).delete();
    q = applyMatch(q, match);

    const { data, error } = await q;
    if (error) throw error;

    return data;
  } catch (err) {
    console.error(`[dbDelete] ${table}`, err);
    throw err;
  }
}