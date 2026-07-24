import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePlayerProfile } from "@/lib/actions/players";
import { GlassCard, Field, TextAreaField, Button, ErrorNote } from "@/components/ui";

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  address_line1: string;
  address_line2: string | null;
  address_town: string;
  address_postcode: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_conditions: string | null;
  allergies: string | null;
  medications: string | null;
  heart_conditions: string | null;
  photo_consent: boolean;
  coc_accepted_at: string;
  teams: { name: string; age_group: string } | null;
};

function LockedCheckbox({
  label,
  checked,
  note,
}: {
  label: string;
  checked: boolean;
  note?: string;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4 opacity-80">
      <input
        type="checkbox"
        checked={checked}
        disabled
        readOnly
        className="mt-0.5 h-5 w-5 accent-(--accent) opacity-60 cursor-not-allowed"
      />
      <span>
        <span className="block text-sm text-white/70">{label}</span>
        {note && <span className="block text-xs text-white/40 mt-0.5">{note}</span>}
      </span>
    </label>
  );
}

export default async function EditPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ playerId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { playerId } = await params;
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(`/players/${playerId}/edit`)}`);
  }

  // RLS scopes this to the parent's own player (or an admin), so a miss
  // here means either it doesn't exist or it isn't theirs — either way,
  // back to the dashboard.
  const { data: player } = await supabase
    .from("players")
    .select(
      `id, first_name, last_name, date_of_birth,
       address_line1, address_line2, address_town, address_postcode,
       emergency_contact_name, emergency_contact_phone,
       medical_conditions, allergies, medications, heart_conditions,
       photo_consent, coc_accepted_at,
       teams ( name, age_group )`,
    )
    .eq("id", playerId)
    .single<PlayerRow>();

  if (!player) {
    redirect("/dashboard");
  }

  const cocDate = new Date(player.coc_accepted_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
          Edit {player.first_name}&apos;s profile
        </h1>
        {player.teams && (
          <p className="text-white/50 text-sm mt-1">
            {player.teams.name} ({player.teams.age_group}) — to change teams,
            contact the club committee.
          </p>
        )}
      </div>

      <ErrorNote message={error} />

      <GlassCard strong className="p-5 sm:p-8">
        <form action={updatePlayerProfile} className="flex flex-col gap-4">
          <input type="hidden" name="playerId" value={player.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              defaultValue={player.first_name}
              required
            />
            <Field
              label="Last name"
              name="lastName"
              defaultValue={player.last_name}
              required
            />
          </div>
          <Field
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            defaultValue={player.date_of_birth}
            required
          />
          <Field
            label="Address line 1"
            name="addressLine1"
            defaultValue={player.address_line1}
            required
          />
          <Field
            label="Address line 2"
            name="addressLine2"
            defaultValue={player.address_line2 ?? ""}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Town"
              name="addressTown"
              defaultValue={player.address_town}
              required
            />
            <Field
              label="Postcode"
              name="addressPostcode"
              defaultValue={player.address_postcode}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Emergency contact name"
              name="emergencyContactName"
              defaultValue={player.emergency_contact_name}
              required
            />
            <Field
              label="Emergency contact phone"
              name="emergencyContactPhone"
              type="tel"
              defaultValue={player.emergency_contact_phone}
              required
            />
          </div>

          <div className="mt-2 flex flex-col gap-4">
            <p className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40">
              Medical
            </p>
            <TextAreaField
              label="Medical conditions"
              name="medicalConditions"
              placeholder="Leave blank if none"
              defaultValue={player.medical_conditions ?? ""}
            />
            <TextAreaField
              label="Heart conditions (player or immediate family)"
              name="heartConditions"
              placeholder="Leave blank if none"
              defaultValue={player.heart_conditions ?? ""}
            />
            <TextAreaField
              label="Allergies"
              name="allergies"
              placeholder="Leave blank if none"
              defaultValue={player.allergies ?? ""}
            />
            <TextAreaField
              label="Medications"
              name="medications"
              placeholder="Leave blank if none"
              defaultValue={player.medications ?? ""}
            />
          </div>

          <Button className="mt-2 self-start">Save changes</Button>
        </form>
      </GlassCard>

      <div>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          Consents on file
        </h2>
        <div className="flex flex-col gap-2">
          <LockedCheckbox
            label="Photos & videos consent"
            checked={player.photo_consent}
            note={
              player.photo_consent
                ? "You agreed your child can appear in club photos and videos."
                : "You did not agree to photos and videos of your child."
            }
          />
          <LockedCheckbox
            label="Codes of conduct accepted"
            checked
            note={`Accepted on ${cocDate}.`}
          />
        </div>
        <p className="mt-3 text-xs text-white/40">
          These are locked as a record of what was agreed at registration. To
          change your photo consent, contact the club.
        </p>
      </div>
    </div>
  );
}
