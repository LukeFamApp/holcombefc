import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlassCard, StatusPill } from "@/components/ui";
import { FineFlags, type PlayerFine } from "@/components/FineFlags";
import { CURRENT_SEASON, FINE_FLAGGED_STATUSES } from "@/lib/config";
import { DEAD_STATUSES } from "@/lib/payments";

type Team = { id: string; name: string; age_group: string };

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  team_id: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_conditions: string | null;
  allergies: string | null;
  medications: string | null;
  heart_conditions: string | null;
  parents: { first_name: string; last_name: string; phone: string | null } | null;
  registrations:
    | {
        season: string;
        status: string;
        payments: { id: string; status: string }[] | null;
      }[]
    | null;
  fines: (PlayerFine & { id: string })[] | null;
};

function ageOn(dob: string): number {
  const born = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const beforeBirthday =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) age--;
  return age;
}

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return <span className="text-white/35">no number</span>;
  return (
    <a
      href={`tel:${phone.replace(/\s+/g, "")}`}
      className="text-accent hover:underline"
    >
      {phone}
    </a>
  );
}

export default async function CoachPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/coach");
  }

  // Which teams this user coaches — explicitly filtered to *their* rows (an
  // admin can read every assignment via RLS, but this page is personal).
  const { data: assignments } = await supabase
    .from("team_coaches")
    .select("teams ( id, name, age_group )")
    .eq("parent_id", user.id)
    .returns<{ teams: Team | null }[]>();

  const teams = (assignments ?? [])
    .map((a) => a.teams)
    .filter((t): t is Team => !!t)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (teams.length === 0) {
    redirect("/dashboard");
  }

  // Coaches have no direct access to players/medical/payment tables (RLS
  // would rightly block it). Instead the server reads exactly what a coach
  // needs — for exactly the team ids confirmed above — with the service
  // role. Address, email and fee amounts deliberately aren't selected.
  const admin = createAdminClient();
  const { data: players } = await admin
    .from("players")
    .select(
      `id, first_name, last_name, date_of_birth, team_id,
       emergency_contact_name, emergency_contact_phone,
       medical_conditions, allergies, medications, heart_conditions,
       parents ( first_name, last_name, phone ),
       registrations ( season, status, payments ( id, status ) ),
       fines ( id, card_type, amount_pence, status )`,
    )
    .in(
      "team_id",
      teams.map((t) => t.id),
    )
    .order("first_name")
    .returns<PlayerRow[]>();

  const allPlayers = players ?? [];

  const paymentIds = allPlayers.flatMap((p) =>
    (p.registrations ?? [])
      .filter((r) => r.season === CURRENT_SEASON)
      .flatMap((r) => (r.payments ?? []).map((pay) => pay.id)),
  );
  const missedPaymentIds = new Set<string>();
  if (paymentIds.length > 0) {
    const { data: dead } = await admin
      .from("payment_collections")
      .select("payment_id")
      .in("payment_id", paymentIds)
      .in("status", DEAD_STATUSES);
    for (const d of dead ?? []) missedPaymentIds.add(d.payment_id);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-10">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          My team{teams.length > 1 ? "s" : ""}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Season {CURRENT_SEASON} · players, fees, medical info and cards.
          Confidential — for coaching use only.
        </p>
      </div>

      {teams.map((team) => {
        const roster = allPlayers.filter((p) => p.team_id === team.id);
        const flagged = roster.filter((p) =>
          (p.fines ?? []).some((f) => FINE_FLAGGED_STATUSES.includes(f.status)),
        ).length;

        return (
          <section key={team.id} className="flex flex-col gap-3">
            <div>
              <h2 className="font-(family-name:--font-display) text-2xl text-white">
                {team.name}{" "}
                <span className="text-white/40 text-lg">({team.age_group})</span>
              </h2>
              <p className="text-xs text-white/45 mt-0.5">
                {roster.length} player{roster.length === 1 ? "" : "s"}
                {flagged > 0 &&
                  ` · ${flagged} with an outstanding card fine`}
              </p>
            </div>

            {roster.length === 0 && (
              <GlassCard className="p-5 text-sm text-white/45">
                No players on this team yet.
              </GlassCard>
            )}

            {roster.map((p) => {
              const reg = (p.registrations ?? []).find(
                (r) => r.season === CURRENT_SEASON,
              );
              const payment = reg?.payments?.[0];
              const paymentStatus = payment?.status;
              const missed = !!payment && missedPaymentIds.has(payment.id);

              const medical = [
                p.medical_conditions && ["Conditions", p.medical_conditions],
                p.allergies && ["Allergies", p.allergies],
                p.medications && ["Medication", p.medications],
              ].filter(Boolean) as [string, string][];

              return (
                <GlassCard key={p.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        {p.first_name} {p.last_name}
                      </h3>
                      <p className="text-xs text-white/45">
                        Age {ageOn(p.date_of_birth)} · DOB {p.date_of_birth}
                      </p>
                    </div>
                    <div className="sm:text-right">
                      {paymentStatus ? (
                        <StatusPill status={paymentStatus} kind="payment" />
                      ) : (
                        <span className="text-xs text-white/40">
                          No {CURRENT_SEASON} registration
                        </span>
                      )}
                      {paymentStatus === "processing" && missed && (
                        <div className="mt-1 text-xs text-red-300">
                          ⚠ Missed a payment
                        </div>
                      )}
                    </div>
                  </div>

                  <FineFlags fines={p.fines} />

                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm">
                    <p className="font-(family-name:--font-ui-mono) text-[10px] uppercase tracking-[0.15em] text-white/40 mb-1">
                      Medical
                    </p>
                    {p.heart_conditions && (
                      <p className="text-red-300 font-semibold">
                        ⚠ Heart: {p.heart_conditions}
                      </p>
                    )}
                    {medical.map(([label, value]) => (
                      <p key={label} className="text-white/80">
                        <span className="text-white/45">{label}:</span> {value}
                      </p>
                    ))}
                    {!p.heart_conditions && medical.length === 0 && (
                      <p className="text-white/40">None declared</p>
                    )}
                  </div>

                  <div className="mt-3 grid gap-1 text-xs text-white/55 sm:grid-cols-2">
                    <p>
                      Parent: {p.parents?.first_name} {p.parents?.last_name} ·{" "}
                      <PhoneLink phone={p.parents?.phone ?? null} />
                    </p>
                    <p>
                      Emergency: {p.emergency_contact_name} ·{" "}
                      <PhoneLink phone={p.emergency_contact_phone} />
                    </p>
                  </div>
                </GlassCard>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
