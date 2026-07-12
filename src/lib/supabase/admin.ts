import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for trusted server-side writes that RLS intentionally
// blocks for parents (payment state transitions driven by GoCardless).
// Never import this from a Client Component.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
