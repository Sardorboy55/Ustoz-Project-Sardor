import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cookie-free anon client for public SSG/ISR pages (catalog, /t/[slug], /s/[subject]).
// Using the cookie-bound server client there would force dynamic rendering.
export function publicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
