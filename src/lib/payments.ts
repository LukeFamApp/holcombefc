import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBillingRequest,
  createPayment,
  createSubscription,
} from "@/lib/gocardless";

export type PaymentRow = {
  id: string;
  registration_id: string;
  amount_pence: number | null;
  status: string;
  method: "full" | "monthly" | null;
  gocardless_billing_request_id: string | null;
  gocardless_mandate_id: string | null;
  gocardless_payment_id: string | null;
  gocardless_subscription_id: string | null;
};

// Once the parent has authorised the mandate on GoCardless, create the
// actual collection (single payment or monthly subscription). Idempotent:
// safe to call from both the browser redirect and the webhook.
export async function fulfilPayment(payment: PaymentRow, feePlan: {
  name: string;
  annual_price_pence: number;
  instalment_count: number | null;
}): Promise<"processing" | "not_ready" | "already_done"> {
  if (payment.gocardless_payment_id || payment.gocardless_subscription_id) {
    return "already_done";
  }
  if (!payment.gocardless_billing_request_id || !payment.method) {
    return "not_ready";
  }

  const br = await getBillingRequest(payment.gocardless_billing_request_id);
  const mandateId = br.links.mandate_request_mandate;
  if (br.status !== "fulfilled" || !mandateId) {
    return "not_ready";
  }

  const admin = createAdminClient();
  const total = feePlan.annual_price_pence;

  if (payment.method === "full") {
    const gcPayment = await createPayment({
      mandateId,
      amountPence: total,
      description: `Holcombe FC — ${feePlan.name}`,
      idempotencyKey: `hfc-payment-${payment.id}`,
    });
    await admin
      .from("payments")
      .update({
        status: "processing",
        amount_pence: total,
        gocardless_mandate_id: mandateId,
        gocardless_payment_id: gcPayment.id,
      })
      .eq("id", payment.id);
  } else {
    const count = feePlan.instalment_count ?? 1;
    const monthly = Math.round(total / count);
    const subscription = await createSubscription({
      mandateId,
      amountPence: monthly,
      count,
      name: `Holcombe FC — ${feePlan.name}`,
      idempotencyKey: `hfc-sub-${payment.id}`,
    });
    await admin
      .from("payments")
      .update({
        status: "processing",
        amount_pence: total,
        gocardless_mandate_id: mandateId,
        gocardless_subscription_id: subscription.id,
      })
      .eq("id", payment.id);
  }

  return "processing";
}
