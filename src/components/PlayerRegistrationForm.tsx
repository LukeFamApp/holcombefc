"use client";

import { useMemo, useState } from "react";
import { addPlayer } from "@/lib/actions/players";
import { Field, TextAreaField, Button } from "@/components/ui";

type FeePlan = {
  id: string;
  name: string;
  annual_price_pence: number;
};

type Team = {
  id: string;
  name: string;
  age_group: string;
  fee_plans: FeePlan[];
};

const selectClass =
  "rounded-lg bg-black/30 border border-white/10 px-3.5 py-2.5 text-white outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors";
const labelClass =
  "text-white/70 font-(family-name:--font-ui-mono) tracking-wide uppercase text-xs";

export default function PlayerRegistrationForm({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState("");

  const feePlans = useMemo(
    () => teams.find((t) => t.id === teamId)?.fee_plans ?? [],
    [teams, teamId],
  );

  return (
    <form action={addPlayer} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" required />
        <Field label="Last name" name="lastName" required />
      </div>
      <Field label="Date of birth" name="dateOfBirth" type="date" required />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>
            Team <span className="text-accent">*</span>
          </span>
          <select
            name="teamId"
            required
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className={selectClass}
          >
            <option value="" disabled>
              Select…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} className="bg-[#0a0f0c]">
                {t.name} ({t.age_group})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className={labelClass}>
            Fee plan <span className="text-accent">*</span>
          </span>
          <select
            name="feePlanId"
            required
            disabled={!teamId}
            defaultValue=""
            className={`${selectClass} disabled:opacity-40`}
          >
            <option value="" disabled>
              {teamId ? "Select…" : "Choose a team first"}
            </option>
            {feePlans.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#0a0f0c]">
                {p.name} — £{(p.annual_price_pence / 100).toFixed(2)}/yr
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Emergency contact name" name="emergencyContactName" required />
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
  );
}
