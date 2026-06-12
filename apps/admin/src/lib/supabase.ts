import { createBrowserClient } from "@supabase/ssr";

// Browser client — anon key + user JWT, RLS applies (как в apps/web).
// createBrowserClient кэширует инстанс (singleton), вызывать можно где угодно.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
