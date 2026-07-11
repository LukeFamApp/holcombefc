import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addPlayer } from "@/lib/actions/players";
import {
  GlassCard,
  Field,
  SelectField,
  TextAreaField,
  Button,
  ErrorNote,
  StatusPill,
} from "@/components/ui";
import { CURRENT_SEASON } from "@/lib/config";

type RegistrationRow = {
  id: string;
  season: string;
  status: string;
  payments: { status: string }[] | null;
};

type PlayerRow = {
  id: string;
  full_name: string;
  date_of_birth: string;
  teams: { name: string; age_group: string } | null;
  registrations: RegistrationRow[] | null;
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/register");
  }

  const [{ data: teams }, { data: players }] = await Promise.all([
    supabase.from("teams").select("id, name, age_group").order("age_group"),
    supabase
      .from("players")
      .select(
        `id, full_name, date_of_birth, teams ( name, age_group ),
         registrations ( id, season, status, payments ( status ) )`,
      )
      .order("created_at", { ascending: false })
      .returns<PlayerRow[]>(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12 flex flex-col gap-10">
      <div>
        <h1 className="font-(family-name:--font-display) text-4xl text-white">
          My Players
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Season {CURRENT_SEASON}. Add a child below to register them with
          Holcombe FC.
        </p>
      </div>

      {players && players.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {players.map((p) => {
            const reg = p.registrations?.find((r) => r.season === CURRENT_SEASON);
            const paymentStatus = reg?.payments?.[0]?.status ?? "not_required";
            return (
              <GlassCard key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-white">{p.full_name}</h3>
                    <p className="text-xs text-white/50 mt-0.5">
                      DOB {p.date_of_birth}
                      {p.teams ? ` · ${p.teams.name}` : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {reg && <StatusPill status={reg.status} />}
                  <StatusPill status={paymentStatus} />
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <GlassCard strong className="p-8">
        <h2 className="font-(family-name:--font-display) text-2xl text-white mb-1">
          Register a player
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Payment isn&apos;t collected yet — we&apos;ll be in touch once
          online payments go live.
        </p>
        <form action={addPlayer} className="flex flex-col gap-4">
          {success && (
            <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
              Player registered for {CURRENT_SEASON}.
            </p>
          )}
          <ErrorNote message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Player full name" name="fullName" required />
            <Field
              label="Date of birth"
              name="dateOfBirth"
              type="date"
              required
            />
          </div>
          <SelectField
            label="Team / age group"
            name="teamId"
            options={(teams ?? []).map((t) => ({
              value: t.id,
              label: `${t.name} (${t.age_group})`,
            }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Emergency contact name"
              name="emergencyContactName"
              required
            />
            <Field
              label="Emergency contact phone"
              name="emergencyContactPhone"
              type="tel"
              required
            />
          </div>
          <TextAreaField
            label="Medical notes (allergies, conditions, etc.)"
            name="medicalNotes"
            placeholder="Leave blank if none"
          />
          <Button className="mt-2 self-start">Register player</Button>
        </form>
      </GlassCard>
    </div>
  );
}
