// admin/js/supabase.js
// Shared Supabase helpers for all admin modules

// IMPORTANT: same project as buyer site
const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// small helper for where conditions
function applyMatch(query, match) {
  if (!match || typeof match !== "object") return query;
  Object.entries(match).forEach(([key, val]) => {
    if (val === undefined) return;
    if (val === null) query = query.is(key, null);
    else query = query.eq(key, val);
  });
  return query;
}

// SELECT (optionally with WHERE)
export async function dbSelect(table, columns = "*", match) {
  try {
    let query = sb.from(table).select(columns);
    query = applyMatch(query, match);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbSelect] table=${table}`, err);
    return [];
  }
}

// INSERT
export async function dbInsert(table, values) {
  try {
    const { data, error } = await sb.from(table).insert(values).select();
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbInsert] table=${table}`, err);
    throw err;
  }
}

// UPDATE with WHERE match
export async function dbUpdate(table, match, values) {
  try {
    let query = sb.from(table).update(values);
    query = applyMatch(query, match);

    const { data, error } = await query.select();
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbUpdate] table=${table}`, err);
    throw err;
  }
}

// (optional) DELETE kung kailangan mo later
export async function dbDelete(table, match) {
  try {
    let query = sb.from(table).delete();
    query = applyMatch(query, match);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbDelete] table=${table}`, err);
    throw err;
  }
}
