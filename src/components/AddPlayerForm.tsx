"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { addPlayer } from "@/lib/actions/players";

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

const inputClass =
  "w-full rounded-lg bg-black/30 border border-white/10 px-3.5 py-3 text-white placeholder-white/30 outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors text-base";
const labelClass =
  "text-white/70 font-(family-name:--font-ui-mono) tracking-wide uppercase text-xs";

function L({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className={labelClass}>
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
    </label>
  );
}

function YesNo({
  value,
  onChange,
}: {
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <div className="flex gap-2">
      {(["yes", "no"] as const).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition-colors ${
            value === v
              ? "border-accent bg-accent/15 text-accent"
              : "border-white/15 text-white/70 hover:bg-white/5"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

const STEPS = ["Player details", "Medical", "Consent"] as const;

function FinalStepButtons({
  onBack,
  onValidate,
}: {
  onBack: () => void;
  onValidate: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  // useFormStatus reads the enclosing <form>'s pending state, so while the
  // server action runs both buttons lock and the label shows progress —
  // no more accidental double-submits.
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={pending}
        className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-40"
      >
        Back
      </button>
      <button
        type="submit"
        onClick={onValidate}
        disabled={pending}
        className="flex-1 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black hover:bg-accent-dim transition-colors disabled:opacity-60"
      >
        {pending ? "Registering… one moment" : "Complete registration"}
      </button>
    </div>
  );
}

export default function AddPlayerForm({ teams }: { teams: Team[] }) {
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState("");

  // Step 1 — details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressTown, setAddressTown] = useState("");
  const [addressPostcode, setAddressPostcode] = useState("");
  const [teamId, setTeamId] = useState("");
  const [feePlanId, setFeePlanId] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Step 2 — medical questionnaire
  const [hasConditions, setHasConditions] = useState<"yes" | "no" | "">("");
  const [conditions, setConditions] = useState("");
  const [hasAllergies, setHasAllergies] = useState<"yes" | "no" | "">("");
  const [allergies, setAllergies] = useState("");
  const [hasMedications, setHasMedications] = useState<"yes" | "no" | "">("");
  const [medications, setMedications] = useState("");

  // Step 3 — consents
  const [photoConsent, setPhotoConsent] = useState<"yes" | "no" | "">("");
  const [cocAccepted, setCocAccepted] = useState(false);

  const feePlans = useMemo(
    () => teams.find((t) => t.id === teamId)?.fee_plans ?? [],
    [teams, teamId],
  );

  function validateStep(current: number): string {
    if (current === 0) {
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !dateOfBirth ||
        !addressLine1.trim() ||
        !addressTown.trim() ||
        !addressPostcode.trim() ||
        !teamId ||
        !feePlanId ||
        !emergencyContactName.trim() ||
        !emergencyContactPhone.trim()
      ) {
        return "Please fill in all required fields before continuing.";
      }
    }
    if (current === 1) {
      if (!hasConditions || !hasAllergies || !hasMedications) {
        return "Please answer every question — choose Yes or No.";
      }
      if (hasConditions === "yes" && !conditions.trim()) {
        return "Please give details of the medical condition(s).";
      }
      if (hasAllergies === "yes" && !allergies.trim()) {
        return "Please give details of the allergies.";
      }
      if (hasMedications === "yes" && !medications.trim()) {
        return "Please give details of the medication(s).";
      }
    }
    if (current === 2) {
      if (!photoConsent) {
        return "Please choose Yes or No for photo permission.";
      }
      if (!cocAccepted) {
        return "You need to accept the codes of conduct to register.";
      }
    }
    return "";
  }

  function next() {
    const err = validateStep(step);
    setStepError(err);
    if (!err) setStep((s) => s + 1);
  }

  function back() {
    setStepError("");
    setStep((s) => s - 1);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((name, i) => (
          <div key={name} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i <= step ? "bg-accent" : "bg-white/10"
              }`}
            />
            <p
              className={`mt-1.5 text-[10px] font-(family-name:--font-ui-mono) uppercase tracking-wide ${
                i === step ? "text-accent" : "text-white/35"
              }`}
            >
              {name}
            </p>
          </div>
        ))}
      </div>

      {stepError && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {stepError}
        </p>
      )}

      {/* STEP 1 — player details */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="First name" required>
              <input
                className={inputClass}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
              />
            </L>
            <L label="Last name" required>
              <input
                className={inputClass}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
              />
            </L>
          </div>
          <L label="Date of birth" required>
            <input
              type="date"
              className={inputClass}
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />
          </L>
          <L label="Address line 1" required>
            <input
              className={inputClass}
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              autoComplete="address-line1"
            />
          </L>
          <L label="Address line 2">
            <input
              className={inputClass}
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              autoComplete="address-line2"
            />
          </L>
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Town" required>
              <input
                className={inputClass}
                value={addressTown}
                onChange={(e) => setAddressTown(e.target.value)}
                autoComplete="address-level2"
              />
            </L>
            <L label="Postcode" required>
              <input
                className={inputClass}
                value={addressPostcode}
                onChange={(e) => setAddressPostcode(e.target.value)}
                autoComplete="postal-code"
              />
            </L>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Team" required>
              <select
                className={inputClass}
                value={teamId}
                onChange={(e) => {
                  setTeamId(e.target.value);
                  setFeePlanId("");
                }}
              >
                <option value="" disabled>
                  Select…
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0a0f1e]">
                    {t.name} ({t.age_group})
                  </option>
                ))}
              </select>
            </L>
            <L label="Fee plan" required>
              <select
                className={`${inputClass} disabled:opacity-40`}
                value={feePlanId}
                disabled={!teamId}
                onChange={(e) => setFeePlanId(e.target.value)}
              >
                <option value="" disabled>
                  {teamId ? "Select…" : "Choose a team first"}
                </option>
                {feePlans.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#0a0f1e]">
                    {p.name} — £{(p.annual_price_pence / 100).toFixed(0)}/yr
                  </option>
                ))}
              </select>
            </L>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <L label="Emergency contact name" required>
              <input
                className={inputClass}
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
            </L>
            <L label="Emergency contact phone" required>
              <input
                type="tel"
                className={inputClass}
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </L>
          </div>
        </div>
      )}

      {/* STEP 2 — medical questionnaire */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-white/55">
            So our coaches can look after {firstName.trim() || "your child"}{" "}
            properly, please answer a few quick medical questions.
          </p>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white">
              Does your child have any medical conditions we should know
              about? (e.g. asthma, epilepsy, diabetes)
            </p>
            <YesNo value={hasConditions} onChange={setHasConditions} />
            {hasConditions === "yes" && (
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Please give details"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white">
              Any allergies? (food, medication, insect stings…)
            </p>
            <YesNo value={hasAllergies} onChange={setHasAllergies} />
            {hasAllergies === "yes" && (
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Please give details"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-white">
              Is your child currently taking any medication?
            </p>
            <YesNo value={hasMedications} onChange={setHasMedications} />
            {hasMedications === "yes" && (
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                placeholder="Please give details (including anything they carry, like an inhaler or EpiPen)"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
              />
            )}
          </div>
        </div>
      )}

      {/* STEP 3 — consents + submit */}
      {step === 2 && (
        <form action={addPlayer} className="flex flex-col gap-5">
          {/* Everything collected in earlier steps travels as hidden fields */}
          <input type="hidden" name="firstName" value={firstName} />
          <input type="hidden" name="lastName" value={lastName} />
          <input type="hidden" name="dateOfBirth" value={dateOfBirth} />
          <input type="hidden" name="addressLine1" value={addressLine1} />
          <input type="hidden" name="addressLine2" value={addressLine2} />
          <input type="hidden" name="addressTown" value={addressTown} />
          <input type="hidden" name="addressPostcode" value={addressPostcode} />
          <input type="hidden" name="teamId" value={teamId} />
          <input type="hidden" name="feePlanId" value={feePlanId} />
          <input
            type="hidden"
            name="emergencyContactName"
            value={emergencyContactName}
          />
          <input
            type="hidden"
            name="emergencyContactPhone"
            value={emergencyContactPhone}
          />
          <input
            type="hidden"
            name="medicalConditions"
            value={hasConditions === "yes" ? conditions : ""}
          />
          <input
            type="hidden"
            name="allergies"
            value={hasAllergies === "yes" ? allergies : ""}
          />
          <input
            type="hidden"
            name="medications"
            value={hasMedications === "yes" ? medications : ""}
          />
          <input type="hidden" name="photoConsent" value={photoConsent} />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-white">
              Photos &amp; videos
            </p>
            <p className="text-sm text-white/55">
              We sometimes take photos and short videos of players for use in
              match reports, on our website, and on our social-media channels.
              Are you happy for your child to be included?
            </p>
            <YesNo value={photoConsent} onChange={setPhotoConsent} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-white">
              Codes of conduct
            </p>
            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/20 p-4 cursor-pointer">
              <input
                type="checkbox"
                name="cocAccepted"
                checked={cocAccepted}
                onChange={(e) => setCocAccepted(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-(--accent)"
              />
              <span className="text-sm text-white/70">
                I have read and accept the Holcombe FC{" "}
                <Link
                  href="/policies"
                  target="_blank"
                  className="text-accent hover:underline"
                >
                  codes of conduct and club policies
                </Link>
                , on behalf of myself and my child.
              </span>
            </label>
          </div>

          <FinalStepButtons
            onBack={back}
            onValidate={(e) => {
              const err = validateStep(2);
              setStepError(err);
              if (err) e.preventDefault();
            }}
          />
        </form>
      )}

      {/* Nav buttons for steps 1–2 */}
      {step < 2 && (
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="rounded-lg border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={next}
            className="flex-1 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-black hover:bg-accent-dim transition-colors"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
