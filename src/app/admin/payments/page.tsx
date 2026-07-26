import { createClient } from "@/lib/supabase/server";
import { GlassCard, StatusPill } from "@/components/ui";
import { AdminTeamFilter } from "@/components/AdminTeamFilter";
import { CURRENT_SEASON } from "@/lib/config";
import { COLLECTED_STATUSES } from "@/lib/payments";

type Team = { id: string; name: string; age_group: string };

type PaymentReportRow = {
  id: string;
  status: string;
  players: {
    first_name: string;
    last_name: string;
    teams: Team | null;
    parents: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
    } | null;
  } | null;
  fee_plans: { name: string; annual_price_pence: number } | null;
  payments:
    | { id: string; status: string; amount_pence: number | null; method: string | null }[]
    | null;
};

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

function summarize(rows: PaymentReportRow[], collected: Map<string, number>) {
  let paid = 0;
  let processing = 0;
  let pending = 0;
  let issues = 0; // failed or cancelled
  let expectedPence = 0;
  let collectedPence = 0;

  for (const r of rows) {
    const payment = r.payments?.[0];
    const status = payment?.status ?? "not_required";
    if (status === "paid") paid++;
    else if (status === "processing") processing++;
    else if (status === "pending") pending++;
    else if (status === "failed" || status === "cancelled") issues++;

    expectedPence += payment?.amount_pence ?? 0;
    collectedPence += payment ? collected.get(payment.id) ?? 0 : 0;
  }

  return {
    count: rows.length,
    paid,
    processing,
    pending,
    issues,
    expectedPence,
    collectedPence,
    outstandingPence: Math.max(expectedPence - collectedPence, 0),
  };
}

function StatTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <GlassCard className="p-4">
      <p className="font-(family-name:--font-ui-mono) text-[10px] uppercase tracking-[0.15em] text-white/40">
        {label}
      </p>
      <p className="mt-1 font-(family-name:--font-display) text-2xl text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-white/45">{sub}</p>}
    </GlassCard>
  );
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>;
}) {
  const { team: activeTeamId } = await searchParams;
  const supabase = await createClient();

  const [{ data: registrations }, { data: allTeams }, { data: collectionRows }] =
    await Promise.all([
      supabase
        .from("registrations")
        .select(
          `id, status,
           players ( first_name, last_name,
                     teams ( id, name, age_group ),
                     parents ( first_name, last_name, email, phone ) ),
           fee_plans ( name, annual_price_pence ),
           payments ( id, status, amount_pence, method )`,
        )
        .eq("season", CURRENT_SEASON)
        .order("created_at", { ascending: false })
        .returns<PaymentReportRow[]>(),
      supabase.from("teams").select("id, name, age_group").order("age_group"),
      supabase.from("payment_collections").select("payment_id, amount_pence, status"),
    ]);

  const teams = allTeams ?? [];
  const allRows = registrations ?? [];

  const collected = new Map<string, number>();
  for (const c of collectionRows ?? []) {
    if (!COLLECTED_STATUSES.includes(c.status)) continue;
    collected.set(c.payment_id, (collected.get(c.payment_id) ?? 0) + c.amount_pence);
  }

  const rows = activeTeamId
    ? allRows.filter((r) => r.players?.teams?.id === activeTeamId)
    : allRows;

  const overall = summarize(rows, collected);

  // Breakdown always covers every team (regardless of the pill filter above)
  // so it works as a comparison view, not just a mirror of the filtered list.
  const byTeam: { team: Team | null; stats: ReturnType<typeof summarize> }[] = [
    ...teams.map((t) => ({
      team: t,
      stats: summarize(
        allRows.filter((r) => r.players?.teams?.id === t.id),
        collected,
      ),
    })),
  ];
  const noTeamRows = allRows.filter((r) => !r.players?.teams);
  if (noTeamRows.length > 0) {
    byTeam.push({ team: null, stats: summarize(noTeamRows, collected) });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 flex flex-col gap-8">
      <div>
        <h1 className="font-(family-name:--font-display) text-4xl text-white">
          Payments
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Season {CURRENT_SEASON}
          {activeTeamId
            ? ` · ${teams.find((t) => t.id === activeTeamId)?.name ?? ""}`
            : " · all teams"}
        </p>
      </div>

      <AdminTeamFilter
        teams={teams}
        activeTeamId={activeTeamId}
        basePath="/admin/payments"
      />

      {/* Summary for the current filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Players" value={String(overall.count)} />
        <StatTile label="Paid" value={String(overall.paid)} />
        <StatTile label="Direct debit active" value={String(overall.processing)} />
        <StatTile label="Payment due" value={String(overall.pending)} />
        <StatTile
          label="Needs attention"
          value={String(overall.issues)}
          sub={overall.issues > 0 ? "Failed or cancelled" : undefined}
        />
        <StatTile
          label="Collected"
          value={pounds(overall.collectedPence)}
          sub={`of ${pounds(overall.expectedPence)} expected`}
        />
      </div>

      {/* By-team breakdown */}
      <section>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          By team
        </h2>
        <GlassCard className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left text-white/50 font-(family-name:--font-ui-mono) text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Players</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Direct debit</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Issues</th>
                <th className="px-4 py-3">Collected</th>
              </tr>
            </thead>
            <tbody>
              {byTeam.map(({ team, stats }) => (
                <tr
                  key={team?.id ?? "none"}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 text-white">
                    {team ? `${team.name} (${team.age_group})` : "No team"}
                  </td>
                  <td className="px-4 py-3 text-white/80">{stats.count}</td>
                  <td className="px-4 py-3 text-accent">{stats.paid}</td>
                  <td className="px-4 py-3 text-blue-200">{stats.processing}</td>
                  <td className="px-4 py-3 text-white/60">{stats.pending}</td>
                  <td className="px-4 py-3">
                    {stats.issues > 0 ? (
                      <span className="text-red-300">{stats.issues}</span>
                    ) : (
                      <span className="text-white/30">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/80">
                    {pounds(stats.collectedPence)}
                    <span className="text-white/40">
                      {" "}
                      / {pounds(stats.expectedPence)}
                    </span>
                  </td>
                </tr>
              ))}
              {byTeam.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                    No teams set up yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>

      {/* Detail list, respecting the team filter */}
      <section>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          Registrations
        </h2>
        <GlassCard className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="text-left text-white/50 font-(family-name:--font-ui-mono) text-xs uppercase tracking-wide border-b border-white/10">
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Fee plan</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const payment = r.payments?.[0];
                const status = payment?.status ?? "not_required";
                const expectedPence = payment?.amount_pence ?? 0;
                const collectedPence = payment
                  ? collected.get(payment.id) ?? 0
                  : 0;
                const needsChasing =
                  status === "pending" ||
                  status === "failed" ||
                  status === "cancelled";
                return (
                  <tr
                    key={r.id}
                    className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-white">
                      {r.players?.first_name} {r.players?.last_name}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {r.players?.teams
                        ? `${r.players.teams.name} (${r.players.teams.age_group})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {r.players?.parents?.first_name} {r.players?.parents?.last_name}
                      <div className="text-xs text-white/40">
                        {r.players?.parents?.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {r.fee_plans?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={status} kind="payment" />
                      {payment?.method && (
                        <div className="mt-1 text-xs text-white/40">
                          {payment.method === "monthly"
                            ? "Monthly DD"
                            : "Paid in full"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/80">
                      {pounds(collectedPence)}
                      <span className="text-white/40">
                        {" "}
                        / {pounds(expectedPence)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {needsChasing && r.players?.parents?.email && (
                        <a
                          href={`mailto:${r.players.parents.email}?subject=${encodeURIComponent(
                            `Holcombe FC — ${r.players.first_name} ${r.players.last_name}'s club fees`,
                          )}`}
                          className="text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide text-accent hover:underline"
                        >
                          Email
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-white/40">
                    No registrations for this filter.
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
