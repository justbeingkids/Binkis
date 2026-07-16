import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

let cached: SupabaseClient | null = null;

/**
 * Browser-side client (anon key). Used only for direct-to-Storage uploads via a
 * server-issued signed URL — the signed token authorizes that one upload, so no
 * RLS write policy is needed. Never use this for reading/writing app data.
 */
export function getBrowserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
