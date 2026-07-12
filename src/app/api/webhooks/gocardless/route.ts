import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fulfilPayment, type PaymentRow } from "@/lib/payments";

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
        // Single "pay in full" collections.
        if (event.action === "confirmed" || event.action === "paid_out") {
          await admin
            .from("payments")
            .update({ status: "paid" })
            .eq("gocardless_payment_id", event.links.payment);
        } else if (event.action === "failed" || event.action === "charged_back") {
          await admin
            .from("payments")
            .update({ status: "failed" })
            .eq("gocardless_payment_id", event.links.payment);
        }
      }

      if (event.resource_type === "subscriptions" && event.links.subscription) {
        // Monthly instalment plans: "finished" = all collections made.
        if (event.action === "finished") {
          await admin
            .from("payments")
            .update({ status: "paid" })
            .eq("gocardless_subscription_id", event.links.subscription);
        } else if (event.action === "cancelled") {
          await admin
            .from("payments")
            .update({ status: "cancelled" })
            .eq("gocardless_subscription_id", event.links.subscription);
        }
      }

      if (event.resource_type === "mandates" && event.links.mandate) {
        if (event.action === "cancelled" || event.action === "failed") {
          await admin
            .from("payments")
            .update({ status: "failed" })
            .eq("gocardless_mandate_id", event.links.mandate)
            .neq("status", "paid");
        }
      }

      if (
        event.resource_type === "billing_requests" &&
        event.action === "fulfilled" &&
        event.links.billing_request
      ) {
        // Safety net: parent authorised the mandate but never returned to
        // the site — create the collection from here instead.
        const { data: payment } = await admin
          .from("payments")
          .select(
            "id, registration_id, amount_pence, status, method, gocardless_billing_request_id, gocardless_mandate_id, gocardless_payment_id, gocardless_subscription_id",
          )
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
