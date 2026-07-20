"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createBillingRequestFlowForPayment,
  friendlyGoCardlessError,
} from "@/lib/payments";

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
  // Only pending, failed, or cancelled payments can (re)start the flow —
  // a cancelled mandate is restarted with a completely fresh one.
  if (!["pending", "failed", "cancelled"].includes(payment.status)) {
    redirect("/dashboard");
  }
  if (method === "monthly" && !feePlan.instalment_count) {
    redirect(`/pay/${registrationId}?error=${encodeURIComponent("Monthly payments aren't available for this plan.")}`);
  }

  let authorisationUrl: string;
  try {
    authorisationUrl = await createBillingRequestFlowForPayment({
      paymentId: payment.id,
      registrationId,
      method,
      parent: registration.players?.parents,
    });
  } catch (err) {
    redirect(
      `/pay/${registrationId}?error=${encodeURIComponent(friendlyGoCardlessError(err))}`,
    );
  }

  redirect(authorisationUrl);
}
