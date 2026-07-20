import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayment } from "@/lib/gocardless";
import {
  fulfilPayment,
  upsertCollections,
  settleStatusFromLedger,
  type PaymentRow,
} from "@/lib/payments";

type GcEvent = {
  resource_type: string;
  action: string;
  links: {
    payment?: string;
    subscription?: string;
    mandate?: string;
    billing_request?: string;
  };
};

const PAYMENT_COLUMNS =
  "id, registration_id, amount_pence, status, method, gocardless_billing_request_id, gocardless_mandate_id, gocardless_payment_id, gocardless_subscription_id";

export async function POST(request: Request) {
  const secret = process.env.GOCARDLESS_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("Webhook-Signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 498 });
  }

  const { events } = JSON.parse(body) as { events: GcEvent[] };
  const admin = createAdminClient();

  for (const event of events) {
    try {
      if (event.resource_type === "payments" && event.links.payment) {
        // Any payment lifecycle event: mirror it into the ledger, then let
        // the ledger decide whether the plan is now fully paid.
        const gcPayment = await getPayment(event.links.payment);

        // Find the plan this collection belongs to: ledger first, then by
        // the subscription/mandate/payment ids stored on payments.
        let paymentRow: PaymentRow | null = null;
        const { data: ledgerRow } = await admin
          .from("payment_collections")
          .select("payment_id")
          .eq("gocardless_payment_id", gcPayment.id)
          .maybeSingle();
        if (ledgerRow) {
          const { data } = await admin
            .from("payments")
            .select(PAYMENT_COLUMNS)
            .eq("id", ledgerRow.payment_id)
            .single<PaymentRow>();
          paymentRow = data;
        } else {
          const sub = gcPayment.links.subscription;
          const mandate = gcPayment.links.mandate;
          const { data } = await admin
            .from("payments")
            .select(PAYMENT_COLUMNS)
            .or(
              [
                `gocardless_payment_id.eq.${gcPayment.id}`,
                sub ? `gocardless_subscription_id.eq.${sub}` : null,
                mandate ? `gocardless_mandate_id.eq.${mandate}` : null,
              ]
                .filter(Boolean)
                .join(","),
            )
            .limit(1)
            .maybeSingle<PaymentRow>();
          paymentRow = data;
        }

        if (paymentRow) {
          await upsertCollections(paymentRow.id, [gcPayment]);
          await settleStatusFromLedger(paymentRow);

          // A failed pay-in-full collection needs the parent to restart;
          // a single failed instalment doesn't kill a monthly plan
          // (GoCardless retries, and the ledger keeps score either way).
          if (
            (event.action === "failed" || event.action === "charged_back") &&
            paymentRow.method === "full" &&
            paymentRow.status !== "paid"
          ) {
            await admin
              .from("payments")
              .update({ status: "failed" })
              .eq("id", paymentRow.id);
          }
        }
      }

      if (event.resource_type === "subscriptions" && event.links.subscription) {
        const { data: paymentRow } = await admin
          .from("payments")
          .select(PAYMENT_COLUMNS)
          .eq("gocardless_subscription_id", event.links.subscription)
          .maybeSingle<PaymentRow>();

        if (paymentRow) {
          if (event.action === "finished") {
            // All instalments submitted — "paid" flips when the final
            // collection confirms via the payments events above.
            await settleStatusFromLedger(paymentRow);
          } else if (
            event.action === "cancelled" &&
            paymentRow.status !== "paid"
          ) {
            await admin
              .from("payments")
              .update({ status: "cancelled" })
              .eq("id", paymentRow.id);
          }
        }
      }

      if (event.resource_type === "mandates" && event.links.mandate) {
        if (event.action === "cancelled" || event.action === "failed") {
          await admin
            .from("payments")
            .update({ status: "cancelled" })
            .eq("gocardless_mandate_id", event.links.mandate)
            .not("status", "in", '("paid")');
        }
      }

      if (
        event.resource_type === "billing_requests" &&
        event.action === "fulfilled" &&
        event.links.billing_request
      ) {
        // Safety net: parent authorised the mandate but never returned to
        // the site — create the collections from here instead.
        const { data: payment } = await admin
          .from("payments")
          .select(PAYMENT_COLUMNS)
          .eq("gocardless_billing_request_id", event.links.billing_request)
          .single<PaymentRow>();

        if (payment) {
          const { data: reg } = await admin
            .from("registrations")
            .select("fee_plans ( name, annual_price_pence, instalment_count )")
            .eq("id", payment.registration_id)
            .single<{
              fee_plans: {
                name: string;
                annual_price_pence: number;
                instalment_count: number | null;
              } | null;
            }>();
          if (reg?.fee_plans) {
            await fulfilPayment(payment, reg.fee_plans);
          }
        }
      }
    } catch {
      // Swallow per-event errors so one bad event doesn't fail the batch;
      // GoCardless retries webhooks that don't get a 2xx.
    }
  }

  return NextResponse.json({ received: events.length });
}
