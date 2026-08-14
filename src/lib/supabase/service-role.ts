import { createClient } from "@supabase/supabase-js";

export function createServiceRoleSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Brak zmiennych środowiskowych Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)."
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
