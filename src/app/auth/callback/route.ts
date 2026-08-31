import { NextResponse } from "next/server";
import { type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// public.parents.email is a separate copy of the address (used for display
// in admin and for mailto: chase links) that only ever gets set at signup.
// If this verification just confirmed an email change, keep it in step —
// harmless no-op for every other link type (signup/recovery), since the
// address hasn't changed in those cases.
async function syncParentEmail(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    await supabase
      .from("parents")
      .update({ email: user.email })
      .eq("id", user.id);
  }
}

// Handles both Supabase auth link styles:
// - PKCE flow: ?code=...
// - Email confirmation/recovery links: ?token_hash=...&type=...
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const redirect = searchParams.get("redirect") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await syncParentEmail(supabase);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) {
      await syncParentEmail(supabase);
      return NextResponse.redirect(`${origin}${redirect}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "That link has expired or already been used — please log in.",
    )}`,
  );
}
