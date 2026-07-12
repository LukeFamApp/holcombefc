import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard, ErrorNote } from "@/components/ui";
import { startPaymentSetup } from "@/lib/actions/payments";

type Row = {
  id: string;
  season: string;
  fee_plans: {
    name: string;
    annual_price_pence: number;
    instalment_count: number | null;
  } | null;
  payments: { status: string }[] | null;
  players: { first_name: string; last_name: string } | null;
};

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
       payments ( status ),
       players ( first_name, last_name )`,
    )
    .eq("id", registrationId)
    .single<Row>();

  if (!registration || !registration.fee_plans) {
    redirect("/dashboard");
  }

  const paymentStatus = registration.payments?.[0]?.status ?? "pending";
  if (paymentStatus === "processing" || paymentStatus === "paid") {
    redirect("/dashboard");
  }

  const plan = registration.fee_plans;
  const total = plan.annual_price_pence / 100;
  const count = plan.instalment_count;
  const monthly = count ? plan.annual_price_pence / count / 100 : null;
  const player = registration.players;

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
      {cancelled && (
        <p className="rounded-lg border border-blue/40 bg-blue/15 px-3.5 py-2.5 text-sm text-blue-200">
          No problem — you can set up your Direct Debit whenever you&apos;re
          ready. Your registration is safe either way.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Pay in full */}
        <GlassCard strong className="p-6 flex flex-col gap-3">
          <p className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
            Pay in full
          </p>
          <p className="font-(family-name:--font-display) text-4xl text-white">
            £{total.toFixed(0)}
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
              Pay £{total.toFixed(0)} by Direct Debit
            </button>
          </form>
        </GlassCard>

        {/* Monthly */}
        {count && monthly ? (
          <GlassCard strong className="p-6 flex flex-col gap-3">
            <p className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
              Pay monthly
            </p>
            <p className="font-(family-name:--font-display) text-4xl text-white">
              £{monthly.toFixed(0)}
              <span className="text-lg text-white/50"> × {count} months</span>
            </p>
            <p className="text-sm text-white/55 flex-1">
              {count} monthly Direct Debit payments of £{monthly.toFixed(0)} —
              same total, spread across the season.
            </p>
            <form action={startPaymentSetup}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <input type="hidden" name="method" value="monthly" />
              <button
                type="submit"
                className="w-full rounded-lg border border-accent/60 px-5 py-3 text-sm font-semibold text-accent hover:bg-accent/10 transition-colors"
              >
                Set up {count} × £{monthly.toFixed(0)}/month
              </button>
            </form>
          </GlassCard>
        ) : (
          <GlassCard className="p-6 flex items-center justify-center text-sm text-white/40 text-center">
            Monthly payments aren&apos;t available for this plan.
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
