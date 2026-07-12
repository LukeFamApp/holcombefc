import { GlassCard } from "@/components/ui";

// Placeholder documents — replace `body` with the real club content (or
// swap to linked PDFs in /public) once provided.
const POLICIES = [
  {
    title: "Code of Conduct — Players",
    summary:
      "What we expect from every player on and off the pitch: respect for teammates, opponents, referees and coaches.",
    body: null,
  },
  {
    title: "Code of Conduct — Parents & Spectators",
    summary:
      "How we keep the touchline positive: encouragement over instruction, respect for officials, and setting the example.",
    body: null,
  },
  {
    title: "Safeguarding Policy",
    summary:
      "How Holcombe FC keeps children safe, our designated safeguarding officer, and how to raise a concern.",
    body: null,
  },
  {
    title: "Photography & Social Media Policy",
    summary:
      "How we use photos and videos of players, and how to change your consent choice at any time.",
    body: null,
  },
] as const;

export default function PoliciesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-6">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          Club policies
        </h1>
        <p className="text-white/50 text-sm mt-1">
          The documents every Holcombe FC family signs up to.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {POLICIES.map((p) => (
          <GlassCard key={p.title} className="p-5 sm:p-6">
            <h2 className="font-semibold text-white">{p.title}</h2>
            <p className="text-sm text-white/55 mt-1">{p.summary}</p>
            <p className="mt-3 inline-block rounded-full border border-blue/40 bg-blue/15 px-3 py-1 text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide text-blue-200">
              Full document coming soon
            </p>
          </GlassCard>
        ))}
      </div>

      <p className="text-xs text-white/40">
        Questions about any of these? Speak to your team&apos;s coach or the
        club committee.
      </p>
    </div>
  );
}
