import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard, ErrorNote } from "@/components/ui";
import { startPaymentSetup } from "@/lib/actions/payments";
import { syncCollections, getBalance } from "@/lib/payments";

type Row = {
  id: string;
  season: string;
  fee_plans: {
    name: string;
    annual_price_pence: number;
    instalment_count: number | null;
  } | null;
  payments:
    | {
        id: string;
        status: string;
        amount_pence: number | null;
        sibling_discount_applied: boolean;
        gocardless_mandate_id: string | null;
      }[]
    | null;
  players: { first_name: string; last_name: string } | null;
};

const pounds = (pence: number) =>
  pence % 100 === 0 ? `£${(pence / 100).toFixed(0)}` : `£${(pence / 100).toFixed(2)}`;

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ registrationId: string }>;
  searchParams: Promise<{ error?: string; cancelled?: string; new?: string }>;
}) {
  const { registrationId } = await params;
  const { error, cancelled } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/pay/${registrationId}`)}`);
  }

  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `id, season,
       fee_plans ( name, annual_price_pence, instalment_count ),
       payments ( id, status, amount_pence, sibling_discount_applied, gocardless_mandate_id ),
       players ( first_name, last_name )`,
    )
    .eq("id", registrationId)
    .single<Row>();

  if (!registration || !registration.fee_plans) {
    redirect("/dashboard");
  }

  const paymentRecord = registration.payments?.[0];
  const paymentStatus = paymentRecord?.status ?? "pending";
  if (paymentStatus === "processing" || paymentStatus === "paid") {
    redirect("/dashboard");
  }

  const plan = registration.fee_plans;
  const player = registration.players;
  // The price locked in at registration (which may include a sibling
  // discount) is authoritative — not necessarily what the fee plan lists now.
  const total = paymentRecord?.amount_pence ?? plan.annual_price_pence;
  const siblingDiscountApplied = paymentRecord?.sibling_discount_applied ?? false;

  // Balance-aware: anything already collected on a previous mandate comes
  // off what a restarted plan will charge.
  let collected = 0;
  let remaining = total;
  if (paymentRecord) {
    try {
      await syncCollections(
        paymentRecord.id,
        paymentRecord.gocardless_mandate_id,
      );
    } catch {
      // GoCardless being unreachable shouldn't block the page — the ledger
      // still holds everything we've seen so far.
    }
    const balance = await getBalance(paymentRecord.id, total);
    collected = balance.collectedPence;
    remaining = balance.remainingPence;
  }

  if (remaining <= 0) {
    // Everything already collected — nothing to set up.
    redirect("/dashboard");
  }

  const planCount = plan.instalment_count;
  const monthlyAmount = planCount ? Math.round(total / planCount) : null;
  const instalments =
    monthlyAmount && monthlyAmount > 0 ? Math.floor(remaining / monthlyAmount) : 0;
  const oddRemainder = monthlyAmount ? remaining - instalments * monthlyAmount : 0;
  const showMonthly = monthlyAmount !== null && instalments >= 2;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white mt-2">
          Set up your club fees
        </h1>
        <p className="text-white/50 text-sm mt-1">
          {player ? `${player.first_name} ${player.last_name} · ` : ""}
          {plan.name} · season {registration.season}
        </p>
      </div>

      <ErrorNote message={error} />
      {siblingDiscountApplied && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          10% sibling discount applied — reflected in the price below.
        </p>
      )}
      {cancelled && (
        <p className="rounded-lg border border-blue/40 bg-blue/15 px-3.5 py-2.5 text-sm text-blue-200">
          No problem — you can set up your Direct Debit whenever you&apos;re
          ready. Your registration is safe either way.
        </p>
      )}
      {collected > 0 && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          {pounds(collected)} of {pounds(total)} has already been collected —
          you&apos;ll only be charged the remaining {pounds(remaining)}.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pay remaining in full */}
        <GlassCard strong className="p-6 flex flex-col gap-3">
          <p className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
            Pay in full
          </p>
          <p className="font-(family-name:--font-display) text-4xl text-white">
            {pounds(remaining)}
          </p>
          <p className="text-sm text-white/55 flex-1">
            One Direct Debit collection, then you&apos;re done for the season.
          </p>
          <form action={startPaymentSetup}>
            <input type="hidden" name="registrationId" value={registration.id} />
            <input type="hidden" name="method" value="full" />
            <button
              type="submit"
              className="w-full rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black hover:bg-accent-dim transition-colors"
            >
              Pay {pounds(remaining)} by Direct Debit
            </button>
          </form>
        </GlassCard>

        {/* Monthly instalments on the remaining balance */}
        {showMonthly && monthlyAmount ? (
          <GlassCard strong className="p-6 flex flex-col gap-3">
            <p className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
              Pay monthly
            </p>
            <p className="font-(family-name:--font-display) text-4xl text-white">
              {pounds(monthlyAmount)}
              <span className="text-lg text-white/50">
                {" "}
                × {instalments} months
              </span>
            </p>
            <p className="text-sm text-white/55 flex-1">
              {instalments} monthly Direct Debit payments of{" "}
              {pounds(monthlyAmount)}
              {oddRemainder > 0
                ? `, plus a one-off ${pounds(oddRemainder)} now to settle the difference`
                : ""}{" "}
              — same total, spread across the season.
            </p>
            <form action={startPaymentSetup}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <input type="hidden" name="method" value="monthly" />
              <button
                type="submit"
                className="w-full rounded-lg border border-accent/60 px-5 py-3 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
              >
                Set up {instalments} × {pounds(monthlyAmount)}/month
              </button>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 flex items-center justify-center text-sm text-white/40 text-center">
            {planCount
              ? "The remaining balance is too small to split monthly — pay it in one go."
              : "Monthly payments aren't available for this plan."}
          </GlassCard>
        )}
      </div>

      <p className="text-xs text-white/40">
        Payments are collected securely by GoCardless, the UK&apos;s Direct
        Debit specialist. You&apos;re protected by the Direct Debit Guarantee
        and can cancel at any time via your bank.
      </p>
    </div>
  );
}
