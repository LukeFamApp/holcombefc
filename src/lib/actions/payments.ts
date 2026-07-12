"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createMandateBillingRequest,
  createBillingRequestFlow,
} from "@/lib/gocardless";

// Kicks off the GoCardless hosted mandate flow for a registration.
// The parent chooses "full" or "monthly" on /pay/[registrationId].
export async function startPaymentSetup(formData: FormData) {
  const registrationId = String(formData.get("registrationId") ?? "");
  const method = String(formData.get("method") ?? "");

  if (!registrationId || (method !== "full" && method !== "monthly")) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/pay/${registrationId}`)}`);
  }

  type RegRow = {
    id: string;
    fee_plans: {
      name: string;
      annual_price_pence: number;
      instalment_count: number | null;
    } | null;
    payments:
      | {
          id: string;
          status: string;
          gocardless_payment_id: string | null;
          gocardless_subscription_id: string | null;
        }[]
      | null;
    players: {
      first_name: string;
      last_name: string;
      parents: { first_name: string; last_name: string; email: string } | null;
    } | null;
  };

  // RLS scopes this select to the parent's own registrations, so a hit
  // doubles as the ownership check.
  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `id,
       fee_plans ( name, annual_price_pence, instalment_count ),
       payments ( id, status, gocardless_payment_id, gocardless_subscription_id ),
       players ( first_name, last_name, parents ( first_name, last_name, email ) )`,
    )
    .eq("id", registrationId)
    .single<RegRow>();

  const payment = registration?.payments?.[0];
  const feePlan = registration?.fee_plans;
  if (!registration || !payment || !feePlan) {
    redirect("/dashboard");
  }
  if (
    payment.gocardless_payment_id ||
    payment.gocardless_subscription_id ||
    payment.status === "paid" ||
    payment.status === "processing"
  ) {
    redirect("/dashboard");
  }
  if (method === "monthly" && !feePlan.instalment_count) {
    redirect(`/pay/${registrationId}?error=${encodeURIComponent("Monthly payments aren't available for this plan.")}`);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const parent = registration.players?.parents;

  let authorisationUrl: string;
  try {
    const billingRequest = await createMandateBillingRequest();

    // Record the chosen method + billing request before redirecting, so the
    // completion step knows what to collect.
    const admin = createAdminClient();
    await admin
      .from("payments")
      .update({
        method,
        gocardless_billing_request_id: billingRequest.id,
      })
      .eq("id", payment.id);

    const flow = await createBillingRequestFlow({
      billingRequestId: billingRequest.id,
      redirectUri: `${siteUrl}/pay/${registrationId}/complete`,
      exitUri: `${siteUrl}/pay/${registrationId}?cancelled=1`,
      prefilledCustomer: parent
        ? {
            given_name: parent.first_name,
            family_name: parent.last_name,
            email: parent.email,
          }
        : undefined,
    });
    authorisationUrl = flow.authorisation_url;
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("GOCARDLESS_ACCESS_TOKEN")
        ? "Online payments aren't switched on yet — the club will be in touch about fees."
        : "Something went wrong talking to our payment provider. Please try again.";
    redirect(`/pay/${registrationId}?error=${encodeURIComponent(message)}`);
  }

  redirect(authorisationUrl);
}
