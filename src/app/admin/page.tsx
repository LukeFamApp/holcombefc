import { createClient } from "@/lib/supabase/server";
import { GlassCard, StatusPill } from "@/components/ui";
import { CURRENT_SEASON } from "@/lib/config";
import { movePlayerToTeam } from "@/lib/actions/teams";
import { resolvePlayerRemoval } from "@/lib/actions/removals";

type RegistrationRow = {
  id: string;
  season: string;
  status: string;
  created_at: string;
  players: {
    id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    medical_conditions: string | null;
    allergies: string | null;
    medications: string | null;
    heart_conditions: string | null;
    photo_consent: boolean;
    teams: { id: string; name: string; age_group: string } | null;
    parents: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
    } | null;
  } | null;
  fee_plans: { name: string; annual_price_pence: number } | null;
  payments: { status: string; method: string | null }[] | null;
};

type RemovalRequestRow = {
  id: string;
  reason: string | null;
  created_at: string;
  players: {
    first_name: string;
    last_name: string;
    parents: { first_name: string; last_name: string; email: string } | null;
  } | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const [{ data: registrations }, { data: allTeams }, { data: removalRequests }] =
    await Promise.all([
      supabase
        .from("registrations")
        .select(
          `id, season, status, created_at,
           players ( id, first_name, last_name, date_of_birth, emergency_contact_name, emergency_contact_phone,
                     medical_conditions, allergies, medications, heart_conditions, photo_consent,
                     teams ( id, name, age_group ), parents ( first_name, last_name, email, phone ) ),
           fee_plans ( name, annual_price_pence ),
           payments ( status, method )`,
        )
        .order("created_at", { ascending: false })
        .returns<RegistrationRow[]>(),
      supabase.from("teams").select("id, name, age_group").order("age_group"),
      supabase
        .from("player_removal_requests")
        .select(
          `id, reason, created_at,
           players ( first_name, last_name, parents ( first_name, last_name, email ) )`,
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .returns<RemovalRequestRow[]>(),
    ]);

  const rows = registrations ?? [];
  const teams = allTeams ?? [];
  const pendingRemovals = removalRequests ?? [];

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 flex flex-col gap-6">
      <div>
        <h1 className="font-(family-name:--font-display) text-4xl text-white">
          Registrations
        </h1>
        <p className="text-white/50 text-sm mt-1">
          {rows.length} registration{rows.length === 1 ? "" : "s"} · Season{" "}
          {CURRENT_SEASON}
        </p>
      </div>

      {pendingRemovals.length > 0 && (
        <GlassCard strong className="p-5">
          <h2 className="font-semibold text-white mb-1">
            Player removal requests
          </h2>
          <p className="text-sm text-white/50 mb-4">
            {pendingRemovals.length} awaiting your review — nothing is
            deleted until you approve it.
          </p>
          <div className="flex flex-col gap-3">
            {pendingRemovals.map((req) => (
              <div
                key={req.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white">
                    {req.players?.first_name} {req.players?.last_name}
                    <span className="text-white/40">
                      {" "}
                      — requested by {req.players?.parents?.first_name}{" "}
                      {req.players?.parents?.last_name} (
                      {req.players?.parents?.email})
                    </span>
                  </p>
                  {req.reason && (
                    <p className="text-xs text-white/50 mt-0.5">
                      &ldquo;{req.reason}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <form action={resolvePlayerRemoval}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button
                      type="submit"
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      Keep player
                    </button>
                  </form>
                  <form action={resolvePlayerRemoval}>
                    <input type="hidden" name="requestId" value={req.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      Approve removal
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="text-left text-white/50 font-(family-name:--font-ui-mono) text-xs uppercase tracking-wide border-b border-white/10">
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3">Fee plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Photos</th>
              <th className="px-4 py-3">Medical</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3 text-white">
                  {r.players?.first_name} {r.players?.last_name}
                  <div className="text-xs text-white/40">
                    DOB {r.players?.date_of_birth}
                  </div>
                </td>
                <td className="px-4 py-3 text-white/80">
                  {r.players && (
                    <form
                      action={movePlayerToTeam}
                      className="flex items-center gap-2"
                    >
                      <input type="hidden" name="playerId" value={r.players.id} />
                      <select
                        name="teamId"
                        defaultValue={r.players.teams?.id ?? ""}
                        className="rounded-lg bg-black/30 border border-white/10 px-2 py-1.5 text-xs text-white outline-none focus:border-accent"
                      >
                        <option value="" disabled>
                          No team
                        </option>
                        {teams.map((t) => (
                          <option key={t.id} value={t.id} className="bg-[#0a0f1e]">
                            {t.name} ({t.age_group})
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg border border-white/15 px-2 py-1.5 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                      >
                        Move
                      </button>
                    </form>
                  )}
                </td>
                <td className="px-4 py-3 text-white/80">
                  {r.players?.parents?.first_name} {r.players?.parents?.last_name}
                  <div className="text-xs text-white/40">
                    {r.players?.parents?.email}
                    {r.players?.parents?.phone
                      ? ` · ${r.players.parents.phone}`
                      : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-white/80">
                  {r.fee_plans
                    ? `${r.fee_plans.name} (£${(
                        r.fee_plans.annual_price_pence / 100
                      ).toFixed(2)}/yr)`
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={r.status} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    status={r.payments?.[0]?.status ?? "not_required"}
                    kind="payment"
                  />
                  {r.payments?.[0]?.method && (
                    <div className="mt-1 text-xs text-white/40">
                      {r.payments[0].method === "monthly"
                        ? "Monthly DD"
                        : "Paid in full"}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      r.players?.photo_consent
                        ? "text-accent"
                        : "text-red-300"
                    }
                  >
                    {r.players?.photo_consent ? "✓ Yes" : "✗ No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-white/60 max-w-[260px]">
                  {[
                    r.players?.medical_conditions &&
                      `Conditions: ${r.players.medical_conditions}`,
                    r.players?.allergies &&
                      `Allergies: ${r.players.allergies}`,
                    r.players?.medications &&
                      `Medication: ${r.players.medications}`,
                    r.players?.heart_conditions &&
                      `⚠ Heart: ${r.players.heart_conditions}`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "None declared"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-white/40">
                  No registrations yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
