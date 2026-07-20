import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncCollections, getBalance } from "@/lib/payments";
import { GlassCard, StatusPill } from "@/components/ui";

type Row = {
  id: string;
  season: string;
  fee_plans: {
    name: string;
    annual_price_pence: number;
    instalment_count: number | null;
  } | null;
  players: { first_name: string; last_name: string } | null;
};

type CollectionRow = {
  gocardless_payment_id: string;
  amount_pence: number;
  charge_date: string | null;
  status: string;
};

// Parent-friendly wording for GoCardless payment lifecycle states.
const GC_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pending_customer_approval: { label: "Awaiting approval", tone: "text-blue-200" },
  pending_submission: { label: "Scheduled", tone: "text-blue-200" },
  submitted: { label: "Processing", tone: "text-blue-200" },
  confirmed: { label: "Collected", tone: "text-accent" },
  paid_out: { label: "Collected", tone: "text-accent" },
  failed: { label: "Failed", tone: "text-red-300" },
  cancelled: { label: "Cancelled", tone: "text-red-300" },
  customer_approval_denied: { label: "Declined", tone: "text-red-300" },
  charged_back: { label: "Charged back", tone: "text-red-300" },
};

export default async function PaymentHistoryPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/login?redirect=${encodeURIComponent(`/payments/${registrationId}`)}`,
    );
  }

  // RLS-scoped read doubles as the ownership check.
  const { data: registration } = await supabase
    .from("registrations")
    .select(
      `id, season,
       fee_plans ( name, annual_price_pence, instalment_count ),
       players ( first_name, last_name )`,
    )
    .eq("id", registrationId)
    .single<Row>();

  if (!registration) {
    redirect("/dashboard");
  }

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, method, gocardless_mandate_id")
    .eq("registration_id", registrationId)
    .single<{
      id: string;
      status: string;
      method: string | null;
      gocardless_mandate_id: string | null;
    }>();

  // Refresh the ledger from the current mandate, then render from the
  // ledger — which also keeps collections from earlier, cancelled mandates.
  let loadError = false;
  if (payment?.gocardless_mandate_id) {
    try {
      await syncCollections(payment.id, payment.gocardless_mandate_id);
    } catch {
      loadError = true;
    }
  }

  const { data: collectionRows } = payment
    ? await admin
        .from("payment_collections")
        .select("gocardless_payment_id, amount_pence, charge_date, status")
        .eq("payment_id", payment.id)
        .order("charge_date", { ascending: true, nullsFirst: false })
        .returns<CollectionRow[]>()
    : { data: [] as CollectionRow[] };
  const collections = collectionRows ?? [];

  const plan = registration.fee_plans;
  const player = registration.players;
  const total = plan?.annual_price_pence ?? 0;
  const balance = payment
    ? await getBalance(payment.id, total)
    : { collectedPence: 0 };

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
          Payment history
        </h1>
        <p className="text-white/50 text-sm mt-1">
          {player ? `${player.first_name} ${player.last_name} · ` : ""}
          {plan?.name} · season {registration.season}
        </p>
      </div>

      {/* Summary */}
      <GlassCard strong className="p-5 sm:p-6 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div>
          <p className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
            Collected so far
          </p>
          <p className="font-(family-name:--font-display) text-3xl text-white mt-1">
            £{(balance.collectedPence / 100).toFixed(2)}
            <span className="text-lg text-white/40">
              {" "}
              / £{(total / 100).toFixed(0)}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          {payment && <StatusPill status={payment.status} kind="payment" />}
          {payment?.method && (
            <span className="text-xs text-white/45">
              {payment.method === "monthly"
                ? "Monthly instalments"
                : "Paying in full"}
            </span>
          )}
        </div>
      </GlassCard>

      {/* Collections list */}
      <GlassCard className="divide-y divide-white/5">
        {collections.map((c) => {
          const s = GC_STATUS_LABELS[c.status] ?? {
            label: c.status.replace(/_/g, " "),
            tone: "text-white/60",
          };
          return (
            <div
              key={c.gocardless_payment_id}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <div>
                <p className="text-sm text-white">
                  {c.charge_date
                    ? new Date(c.charge_date + "T00:00:00").toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "long", year: "numeric" },
                      )
                    : "Date to be confirmed"}
                </p>
                <p className={`text-xs ${s.tone}`}>{s.label}</p>
              </div>
              <p className="font-(family-name:--font-ui-mono) text-white">
                £{(c.amount_pence / 100).toFixed(2)}
              </p>
            </div>
          );
        })}
        {collections.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-white/40">
            {loadError
              ? "We couldn't refresh your payments just now — please try again shortly."
              : "No collections yet — payments will appear here once your first one is scheduled."}
          </p>
        )}
      </GlassCard>

      <p className="text-xs text-white/40">
        Direct Debit collections usually take 3–5 working days to clear after
        the charge date. If something looks wrong, contact the club and
        we&apos;ll sort it out.
      </p>
    </div>
  );
}
