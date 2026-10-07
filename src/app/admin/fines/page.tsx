import { createClient } from "@/lib/supabase/server";
import {
  GlassCard,
  SelectField,
  Button,
  ErrorNote,
  StatusPill,
} from "@/components/ui";
import { issueFine, withdrawFine } from "@/lib/actions/fines";
import { FINE_AMOUNTS_PENCE, FINE_UNPAID_STATUSES } from "@/lib/config";

type PlayerOption = {
  id: string;
  first_name: string;
  last_name: string;
  teams: { name: string } | null;
};

type FineRow = {
  id: string;
  card_type: "yellow" | "red";
  amount_pence: number;
  status: string;
  created_at: string;
  players: {
    first_name: string;
    last_name: string;
    teams: { name: string; age_group: string } | null;
    parents: { first_name: string; last_name: string; email: string } | null;
  } | null;
};

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

export default async function AdminFinesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; issued?: string }>;
}) {
  const { error, issued } = await searchParams;
  const supabase = await createClient();

  const [{ data: players }, { data: fines }] = await Promise.all([
    supabase
      .from("players")
      .select("id, first_name, last_name, teams ( name )")
      .order("first_name")
      .returns<PlayerOption[]>(),
    supabase
      .from("fines")
      .select(
        `id, card_type, amount_pence, status, created_at,
         players ( first_name, last_name,
                   teams ( name, age_group ),
                   parents ( first_name, last_name, email ) )`,
      )
      .order("created_at", { ascending: false })
      .returns<FineRow[]>(),
  ]);

  const playerOptions = [...(players ?? [])]
    .sort((a, b) =>
      (a.teams?.name ?? "~").localeCompare(b.teams?.name ?? "~") ||
      a.first_name.localeCompare(b.first_name),
    )
    .map((p) => ({
      value: p.id,
      label: `${p.first_name} ${p.last_name} — ${p.teams?.name ?? "No team"}`,
    }));

  const rows = fines ?? [];
  const unpaid = rows.filter((f) => FINE_UNPAID_STATUSES.includes(f.status));

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="font-(family-name:--font-display) text-4xl text-white">
          Fines
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Issue a yellow or red card against a player. It flags to their
          team&apos;s coaches until the parent has paid, then clears
          automatically.
        </p>
      </div>

      <ErrorNote message={error} />
      {issued && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          Card issued — it now shows against the player.
        </p>
      )}

      <GlassCard strong className="p-5 sm:p-8">
        <h2 className="font-(family-name:--font-display) text-2xl text-white mb-4">
          Issue a card
        </h2>
        <form
          action={issueFine}
          className="grid gap-4 sm:grid-cols-[2fr_1.2fr_auto] sm:items-end"
        >
          <SelectField
            label="Player"
            name="playerId"
            required
            options={playerOptions}
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
          <Button>Issue card</Button>
        </form>
      </GlassCard>

      <section>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          All fines · {unpaid.length} unpaid
        </h2>
        <GlassCard className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-white/50 font-(family-name:--font-ui-mono) text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Card</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((f) => (
                <tr
                  key={f.id}
                  className={`border-b border-white/5 last:border-0 hover:bg-white/[0.03] ${
                    f.status === "withdrawn" ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-4 py-3 text-white">
                    {f.players?.first_name} {f.players?.last_name}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {f.players?.teams
                      ? `${f.players.teams.name} (${f.players.teams.age_group})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {f.players?.parents?.first_name}{" "}
                    {f.players?.parents?.last_name}
                    <div className="text-xs text-white/40">
                      {f.players?.parents?.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        f.card_type === "yellow" ? "text-accent" : "text-red-300"
                      }
                    >
                      {f.card_type === "yellow" ? "Yellow" : "Red"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {pounds(f.amount_pence)}
                  </td>
                  <td className="px-4 py-3">
                    {f.status === "withdrawn" ? (
                      <span className="text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide text-white/50">
                        Withdrawn
                      </span>
                    ) : (
                      <StatusPill status={f.status} kind="payment" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/50">
                    {new Date(f.created_at).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    {FINE_UNPAID_STATUSES.includes(f.status) && (
                      <form action={withdrawFine}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          type="submit"
                          className="text-xs text-red-300/80 hover:text-red-300 transition-colors"
                        >
                          Withdraw
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-white/40">
                    No cards issued yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>
    </div>
  );
}
