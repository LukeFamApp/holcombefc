import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBillingRequest,
  createPayment,
  createSubscription,
  createMandateBillingRequest,
  createBillingRequestFlow,
  listPaymentsForMandate,
  type GcPaymentDetail,
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

export type FeePlanInfo = {
  name: string;
  annual_price_pence: number;
  instalment_count: number | null;
};

// GoCardless payment states where the money arrived…
export const COLLECTED_STATUSES = ["confirmed", "paid_out"];
const COLLECTED = COLLECTED_STATUSES;
// …and where it definitely isn't coming (anything else is in flight).
const DEAD = [
  "failed",
  "cancelled",
  "customer_approval_denied",
  "charged_back",
];

export type Balance = {
  totalPence: number;
  collectedPence: number; // money that has actually cleared
  committedPence: number; // cleared + currently in flight
  remainingPence: number; // what a (re)started plan should still collect
};

// Starts (or restarts) the GoCardless hosted mandate flow for a payment,
// recording the chosen method + billing request before returning the URL
// to redirect the parent to. Shared by the standalone /pay page and the
// straight-into-payment path at the end of registration.
export async function createBillingRequestFlowForPayment(options: {
  paymentId: string;
  registrationId: string;
  method: "full" | "monthly";
  parent?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const billingRequest = await createMandateBillingRequest();

  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({
      method: options.method,
      gocardless_billing_request_id: billingRequest.id,
    })
    .eq("id", options.paymentId);

  const flow = await createBillingRequestFlow({
    billingRequestId: billingRequest.id,
    redirectUri: `${siteUrl}/pay/${options.registrationId}/complete`,
    exitUri: `${siteUrl}/pay/${options.registrationId}?cancelled=1`,
    prefilledCustomer: options.parent?.email
      ? {
          given_name: options.parent.first_name ?? undefined,
          family_name: options.parent.last_name ?? undefined,
          email: options.parent.email,
        }
      : undefined,
  });
  return flow.authorisation_url;
}

// Consistent, non-alarming wording for the (rare) case where GoCardless
// can't be reached — used by both entry points into the payment flow.
export function friendlyGoCardlessError(err: unknown): string {
  return err instanceof Error && err.message.includes("GOCARDLESS_ACCESS_TOKEN")
    ? "Online payments aren't switched on yet — the club will be in touch about fees."
    : "Something went wrong talking to our payment provider. Please try again from your dashboard.";
}

// Mirror GoCardless's record of collections on a mandate into our ledger.
export async function syncCollections(
  paymentId: string,
  mandateId: string | null,
): Promise<void> {
  if (!mandateId) return;
  const gcPayments = await listPaymentsForMandate(mandateId);
  await upsertCollections(paymentId, gcPayments);
}

export async function upsertCollections(
  paymentId: string,
  gcPayments: GcPaymentDetail[],
): Promise<void> {
  if (gcPayments.length === 0) return;
  const admin = createAdminClient();
  await admin.from("payment_collections").upsert(
    gcPayments.map((p) => ({
      payment_id: paymentId,
      gocardless_payment_id: p.id,
      amount_pence: p.amount,
      charge_date: p.charge_date ?? null,
      status: p.status,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "gocardless_payment_id" },
  );
}

export async function getBalance(
  paymentId: string,
  totalPence: number,
): Promise<Balance> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("payment_collections")
    .select("amount_pence, status")
    .eq("payment_id", paymentId);

  const rows = data ?? [];
  const collectedPence = rows
    .filter((r) => COLLECTED.includes(r.status))
    .reduce((sum, r) => sum + r.amount_pence, 0);
  const committedPence = rows
    .filter((r) => !DEAD.includes(r.status))
    .reduce((sum, r) => sum + r.amount_pence, 0);

  return {
    totalPence,
    collectedPence,
    committedPence,
    remainingPence: Math.max(totalPence - committedPence, 0),
  };
}

// Recompute the plan-level status from the ledger: fully collected = paid.
export async function settleStatusFromLedger(
  payment: Pick<PaymentRow, "id" | "amount_pence" | "status">,
): Promise<void> {
  if (!payment.amount_pence) return;
  const { collectedPence } = await getBalance(payment.id, payment.amount_pence);
  if (collectedPence >= payment.amount_pence && payment.status !== "paid") {
    const admin = createAdminClient();
    await admin
      .from("payments")
      .update({ status: "paid" })
      .eq("id", payment.id);
  }
}

// Once the parent has authorised the mandate on GoCardless, create the
// collections for whatever is still outstanding. Idempotent per attempt:
// safe to call from both the browser redirect and the webhook.
export async function fulfilPayment(
  payment: PaymentRow,
  feePlan: FeePlanInfo,
): Promise<"processing" | "paid" | "not_ready" | "already_done"> {
  // Old GoCardless ids from a failed/cancelled attempt don't block a retry —
  // they get overwritten once the fresh mandate is fulfilled below.
  const isRetry = payment.status === "failed" || payment.status === "cancelled";
  if (
    (payment.gocardless_payment_id || payment.gocardless_subscription_id) &&
    !isRetry
  ) {
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
  // The price agreed at registration (which may include a sibling discount)
  // is authoritative — not whatever the fee plan happens to cost now.
  const total = payment.amount_pence ?? feePlan.annual_price_pence;

  // Bring the ledger up to date with the previous mandate (if any) so the
  // outstanding balance accounts for everything already collected.
  if (payment.gocardless_mandate_id) {
    await syncCollections(payment.id, payment.gocardless_mandate_id);
  }
  const { remainingPence, collectedPence } = await getBalance(payment.id, total);

  if (remainingPence <= 0) {
    await admin
      .from("payments")
      .update({
        status: collectedPence >= total ? "paid" : "processing",
        amount_pence: total,
        gocardless_mandate_id: mandateId,
      })
      .eq("id", payment.id);
    return "paid";
  }

  // Key on the billing request (unique per attempt) so browser + webhook
  // double-fulfilment is idempotent, but a genuine retry after a cancelled
  // mandate creates fresh collections rather than resurrecting old ones.
  const attemptKey = payment.gocardless_billing_request_id;

  if (payment.method === "full") {
    const gcPayment = await createPayment({
      mandateId,
      amountPence: remainingPence,
      description: `Holcombe FC — ${feePlan.name}`,
      idempotencyKey: `hfc-payment-${attemptKey}`,
    });
    await upsertCollections(payment.id, [gcPayment]);
    await admin
      .from("payments")
      .update({
        status: "processing",
        amount_pence: total,
        gocardless_mandate_id: mandateId,
        gocardless_payment_id: gcPayment.id,
        gocardless_subscription_id: null,
      })
      .eq("id", payment.id);
    return "processing";
  }

  // Monthly: collect the outstanding balance as instalments of the plan's
  // monthly amount, with any odd remainder (possible after a partial season
  // of collections) taken as an immediate one-off so the sums always close.
  const planCount = feePlan.instalment_count ?? 1;
  const monthlyAmount = Math.round(total / planCount);
  const instalments = Math.floor(remainingPence / monthlyAmount);
  const oddRemainder = remainingPence - instalments * monthlyAmount;

  let oddPaymentId: string | null = null;
  if (oddRemainder > 0 || instalments === 0) {
    const oddAmount = instalments === 0 ? remainingPence : oddRemainder;
    const oddPayment = await createPayment({
      mandateId,
      amountPence: oddAmount,
      description: `Holcombe FC — ${feePlan.name} (balance)`,
      idempotencyKey: `hfc-odd-${attemptKey}`,
    });
    oddPaymentId = oddPayment.id;
    await upsertCollections(payment.id, [oddPayment]);
  }

  let subscriptionId: string | null = null;
  if (instalments > 0) {
    const subscription = await createSubscription({
      mandateId,
      amountPence: monthlyAmount,
      count: instalments,
      name: `Holcombe FC — ${feePlan.name}`,
      idempotencyKey: `hfc-sub-${attemptKey}`,
    });
    subscriptionId = subscription.id;
  }

  await admin
    .from("payments")
    .update({
      status: "processing",
      amount_pence: total,
      gocardless_mandate_id: mandateId,
      gocardless_subscription_id: subscriptionId,
      gocardless_payment_id: oddPaymentId,
    })
    .eq("id", payment.id);
  return "processing";
}
