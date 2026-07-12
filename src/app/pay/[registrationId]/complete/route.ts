import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfilPayment, type PaymentRow } from "@/lib/payments";

// GoCardless redirects the parent here after they authorise the mandate on
// the hosted page. Creates the actual collection (idempotent — the webhook
// covers the case where the parent never comes back).
export async function GET(
  request: Request,
  { params }: { params: Promise<{ registrationId: string }> },
) {
  const { registrationId } = await params;
  const { origin } = new URL(request.url);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${origin}/login?redirect=${encodeURIComponent(`/pay/${registrationId}`)}`,
    );
  }

  // Ownership check via RLS…
  const { data: registration } = await supabase
    .from("registrations")
    .select("id")
    .eq("id", registrationId)
    .single();
  if (!registration) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  // …then trusted reads/writes via the service role.
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select(
      "id, registration_id, amount_pence, status, method, gocardless_billing_request_id, gocardless_mandate_id, gocardless_payment_id, gocardless_subscription_id",
    )
    .eq("registration_id", registrationId)
    .single<PaymentRow>();

  const { data: reg } = await admin
    .from("registrations")
    .select("fee_plans ( name, annual_price_pence, instalment_count )")
    .eq("id", registrationId)
    .single<{
      fee_plans: {
        name: string;
        annual_price_pence: number;
        instalment_count: number | null;
      } | null;
    }>();

  if (!payment || !reg?.fee_plans) {
    return NextResponse.redirect(`${origin}/dashboard`);
  }

  try {
    const outcome = await fulfilPayment(payment, reg.fee_plans);
    if (outcome === "not_ready") {
      return NextResponse.redirect(
        `${origin}/pay/${registrationId}?error=${encodeURIComponent(
          "Your Direct Debit isn't finished yet — please try again.",
        )}`,
      );
    }
  } catch {
    return NextResponse.redirect(
      `${origin}/pay/${registrationId}?error=${encodeURIComponent(
        "We couldn't finish setting up your payment — please try again.",
      )}`,
    );
  }

  return NextResponse.redirect(`${origin}/dashboard?payment=setup`);
}
