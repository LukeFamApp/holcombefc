import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfilFine, type FineRow } from "@/lib/payments";

const FINE_COLUMNS =
  "id, player_id, card_type, amount_pence, status, gocardless_billing_request_id, gocardless_mandate_id, gocardless_payment_id";

// GoCardless redirects the parent here after they authorise the mandate on
// the hosted page. Creates the actual collection (idempotent — the webhook
// covers the case where the parent never comes back).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fineId: string }> },
) {
  const { fineId } = await params;
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent("/fines")}`,
    );
  }

  // Ownership check via RLS…
  const { data: ownedFine } = await supabase
    .from("fines")
    .select("id")
    .eq("id", fineId)
    .single();
  if (!ownedFine) {
    return NextResponse.redirect(`${origin}/fines`);
  }

  // …then trusted reads/writes via the service role.
  const admin = createAdminClient();
  const { data: fine } = await admin
    .from("fines")
    .select(FINE_COLUMNS)
    .eq("id", fineId)
    .single<FineRow>();

  if (!fine) {
    return NextResponse.redirect(`${origin}/fines`);
  }

  try {
    const outcome = await fulfilFine(fine);
    if (outcome === "not_ready") {
      return NextResponse.redirect(
        `${origin}/fines?error=${encodeURIComponent(
          "Your Direct Debit isn't finished yet — please try again.",
        )}`,
      );
    }
  } catch {
    return NextResponse.redirect(
      `${origin}/fines?error=${encodeURIComponent(
        "We couldn't finish setting up your payment — please try again.",
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}/dashboard?fine=setup`);
}
