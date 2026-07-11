import { createClient } from "@/lib/supabase/server";
import { GlassCard, StatusPill } from "@/components/ui";
import { CURRENT_SEASON } from "@/lib/config";

type RegistrationRow = {
  id: string;
  season: string;
  status: string;
  created_at: string;
  players: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    medical_notes: string | null;
    teams: { name: string; age_group: string } | null;
    parents: {
      first_name: string;
      last_name: string;
      email: string;
      phone: string | null;
    } | null;
  } | null;
  fee_plans: { name: string; annual_price_pence: number } | null;
  payments: { status: string }[] | null;
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      `id, season, status, created_at,
       players ( first_name, last_name, date_of_birth, emergency_contact_name, emergency_contact_phone, medical_notes,
                 teams ( name, age_group ), parents ( first_name, last_name, email, phone ) ),
       fee_plans ( name, annual_price_pence ),
       payments ( status )`,
    )
    .order("created_at", { ascending: false })
    .returns<RegistrationRow[]>();

  const rows = registrations ?? [];

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
              <th className="px-4 py-3">Medical notes</th>
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
                  {r.players?.teams
                    ? `${r.players.teams.name} (${r.players.teams.age_group})`
                    : "—"}
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
                  <StatusPill status={r.payments?.[0]?.status ?? "not_required"} />
                </td>
                <td className="px-4 py-3 text-white/60 max-w-[220px] truncate">
                  {r.players?.medical_notes || "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-white/40">
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
