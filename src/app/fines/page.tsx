import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard, ErrorNote, StatusPill } from "@/components/ui";
import { payFine } from "@/lib/actions/fines";
import { FINE_UNPAID_STATUSES } from "@/lib/config";

type FineRow = {
  id: string;
  card_type: "yellow" | "red";
  amount_pence: number;
  status: string;
  created_at: string;
  players: { first_name: string; last_name: string } | null;
};

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

function FineLine({ fine }: { fine: FineRow }) {
  return (
    <div>
      <p className="text-sm text-white">
        {fine.players
          ? `${fine.players.first_name} ${fine.players.last_name}`
          : "—"}{" "}
        <span className="text-white/40">
          · {fine.card_type === "yellow" ? "Yellow" : "Red"} card ·{" "}
          {pounds(fine.amount_pence)}
        </span>
      </p>
      <p className="text-xs text-white/35 mt-0.5">
        Issued {new Date(fine.created_at).toLocaleDateString("en-GB")}
      </p>
    </div>
  );
}

export default async function FinesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cancelled?: string }>;
}) {
  const { error, cancelled } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/fines");
  }

  // Explicit parent filter, not just RLS: an admin's own /fines page must
  // list only fines against their own children, not every family's.
  const { data: myPlayers } = await supabase
    .from("players")
    .select("id")
    .eq("parent_id", user.id);
  const playerIds = (myPlayers ?? []).map((p) => p.id);

  const { data: fines } = playerIds.length
    ? await supabase
        .from("fines")
        .select(
          "id, card_type, amount_pence, status, created_at, players ( first_name, last_name )",
        )
        .in("player_id", playerIds)
        .neq("status", "withdrawn")
        .order("created_at", { ascending: false })
        .returns<FineRow[]>()
    : { data: [] as FineRow[] };

  const all = fines ?? [];
  const toPay = all.filter((f) => FINE_UNPAID_STATUSES.includes(f.status));
  const inProgress = all.filter((f) => f.status === "processing");
  const history = all.filter((f) => f.status === "paid");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-white/50 hover:text-white transition-colors"
        >
          ← Back to dashboard
        </Link>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white mt-2">
          Pay a fine
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Fines for yellow and red cards, collected by Direct Debit via
          GoCardless.
        </p>
      </div>

      <ErrorNote message={error} />
      {cancelled && (
        <p className="rounded-lg border border-blue/40 bg-blue/15 px-3.5 py-2.5 text-sm text-blue-200">
          No problem — you can pay whenever you&apos;re ready.
        </p>
      )}

      {toPay.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
            To pay
          </h2>
          {toPay.map((fine) => (
            <GlassCard
              key={fine.id}
              strong
              className="p-4 sm:p-5 flex items-center justify-between gap-4 flex-wrap"
            >
              <FineLine fine={fine} />
              <form action={payFine}>
                <input type="hidden" name="fineId" value={fine.id} />
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-black hover:bg-accent-dim transition-colors"
                >
                  {fine.status === "pending"
                    ? `Pay ${pounds(fine.amount_pence)}`
                    : `Try again — ${pounds(fine.amount_pence)}`}
                </button>
              </form>
            </GlassCard>
          ))}
          <p className="text-xs text-white/40">
            You&apos;ll be taken to GoCardless to authorise a one-off Direct
            Debit for the fine amount — not a card payment. You&apos;re
            protected by the Direct Debit Guarantee.
          </p>
        </section>
      ) : (
        <GlassCard strong className="p-6 text-center text-white/50 text-sm">
          You have no fines to pay.
        </GlassCard>
      )}

      {inProgress.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
            Payment in progress
          </h2>
          {inProgress.map((fine) => (
            <GlassCard
              key={fine.id}
              className="p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <FineLine fine={fine} />
              <StatusPill status="processing" kind="payment" />
            </GlassCard>
          ))}
        </section>
      )}

      {history.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
            Paid
          </h2>
          {history.map((fine) => (
            <GlassCard
              key={fine.id}
              className="p-4 flex items-center justify-between gap-3 flex-wrap"
            >
              <FineLine fine={fine} />
              <StatusPill status="paid" kind="payment" />
            </GlassCard>
          ))}
        </section>
      )}
    </div>
  );
}
