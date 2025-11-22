// js/supabase.js (BUYER)
// SAFE public-facing Supabase client (same as admin but no delete)

const SUPABASE_URL = "https://hnymqvkfmythdxtjqeam.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhueW1xdmtmbXl0aGR4dGpxZWFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMjE3NTUsImV4cCI6MjA3ODY5Nzc1NX0.4ww5fKNnbhNzNrkJZLa466b6BsKE_yYMO2YH6-auFlI";

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

function applyMatch(query, match) {
  if (!match) return query;
  for (const [k, v] of Object.entries(match)) {
    if (v === null) query = query.is(k, null);
    else query = query.eq(k, v);
  }
  return query;
}

export async function dbSelect(table, columns = "*", match) {
  let q = sb.from(table).select(columns);
  q = applyMatch(q, match);

  const { data, error } = await q;
  if (error) {
    console.error("[dbSelect]", table, error);
    return [];
  }
  return data || [];
}

export async function dbInsert(table, values) {
  const { data, error } = await sb.from(table).insert(values).select();
  if (error) throw error;
  return data;
}

export async function dbUpdate(table, match, values) {
  let q = sb.from(table).update(values);
  q = applyMatch(q, match);
  const { data, error } = await q.select();
  if (error) throw error;
  return data;
}