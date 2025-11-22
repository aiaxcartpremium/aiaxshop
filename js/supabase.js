/* ============================================
   Supabase JS Client (Shared for Buyer + Admin)
============================================ */

export const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

/* Create Supabase instance */
export const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ============================================
   Helper: format where() conditions
============================================ */
function applyMatch(query, match) {
  if (!match || typeof match !== "object") return query;

  Object.entries(match).forEach(([key, val]) => {
    if (val === undefined) return;
    if (val === null) query = query.is(key, null);
    else query = query.eq(key, val);
  });

  return query;
}

/* ============================================
   SELECT
============================================ */
export async function dbSelect(table, columns = "*", match = null) {
  try {
    let q = sb.from(table).select(columns);
    q = applyMatch(q, match);

    const { data, error } = await q;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbSelect] Error from table=${table}`, err);
    return [];
  }
}

/* ============================================
   INSERT
============================================ */
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

/* ============================================
   UPDATE
============================================ */
export async function dbUpdate(table, match, values) {
  try {
    let q = sb.from(table).update(values);
    q = applyMatch(q, match);

    const { data, error } = await q.select();

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbUpdate] table=${table}`, err);
    throw err;
  }
}

/* ============================================
   DELETE
============================================ */
export async function dbDelete(table, match) {
  try {
    let q = sb.from(table).delete();
    q = applyMatch(q, match);

    const { data, error } = await q;

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(`[dbDelete] table=${table}`, err);
    throw err;
  }
}