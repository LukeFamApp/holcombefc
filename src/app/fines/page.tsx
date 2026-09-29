import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard, SelectField, Button, ErrorNote, StatusPill } from "@/components/ui";
import { payFine } from "@/lib/actions/fines";
import { FINE_AMOUNTS_PENCE } from "@/lib/config";

type PlayerOption = { id: string; first_name: string; last_name: string };

type FineRow = {
  id: string;
  card_type: "yellow" | "red";
  amount_pence: number;
  status: string;
  created_at: string;
  players: { first_name: string; last_name: string } | null;
};

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

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

  const [{ data: players }, { data: fines }] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("parent_id", user.id)
      .order("first_name")
      .returns<PlayerOption[]>(),
    supabase
      .from("fines")
      .select(
        "id, card_type, amount_pence, status, created_at, players ( first_name, last_name )",
      )
      .order("created_at", { ascending: false })
      .returns<FineRow[]>(),
  ]);

  const playerOptions = players ?? [];
  const existingFines = fines ?? [];

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
          Disciplinary fines for yellow and red cards, collected by Direct
          Debit via GoCardless.
        </p>
      </div>

      <ErrorNote message={error} />
      {cancelled && (
        <p className="rounded-lg border border-blue/40 bg-blue/15 px-3.5 py-2.5 text-sm text-blue-200">
          No problem — you can pay whenever you&apos;re ready.
        </p>
      )}

      {playerOptions.length === 0 ? (
        <GlassCard strong className="p-6 text-center text-white/50 text-sm">
          You don&apos;t have any players registered yet.
        </GlassCard>
      ) : (
        <GlassCard strong className="p-5 sm:p-8">
          <form action={payFine} className="flex flex-col gap-4">
            <SelectField
              label="Player"
              name="playerId"
              required
              options={playerOptions.map((p) => ({
                value: p.id,
                label: `${p.first_name} ${p.last_name}`,
              }))}
            />
            <SelectField
              label="Card"
              name="cardType"
              required
              options={[
                {
                  value: "yellow",
                  label: `Yellow card — ${pounds(FINE_AMOUNTS_PENCE.yellow)}`,
                },
                {
                  value: "red",
                  label: `Red card — ${pounds(FINE_AMOUNTS_PENCE.red)}`,
                },
              ]}
            />
            <p className="text-xs text-white/40">
              You&apos;ll be taken to GoCardless to authorise a one-off Direct
              Debit for the fine amount — not a card payment. You&apos;re
              protected by the Direct Debit Guarantee.
            </p>
            <Button className="mt-2 self-start">Continue to payment</Button>
          </form>
        </GlassCard>
      )}

      {existingFines.length > 0 && (
        <section>
          <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
            Fine history
          </h2>
          <div className="flex flex-col gap-2">
            {existingFines.map((fine) => (
              <GlassCard
                key={fine.id}
                className="p-4 flex items-center justify-between gap-3 flex-wrap"
              >
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
                    {new Date(fine.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <StatusPill status={fine.status} kind="payment" />
              </GlassCard>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
