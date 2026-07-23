import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui";

const ICON_PATHS: Record<string, React.ReactNode> = {
  // Heroicons-style 24x24 outline paths
  heart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
    />
  ),
  mail: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
    />
  ),
};

function ContactIcon({ icon }: { icon: keyof typeof ICON_PATHS }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden
      className="h-7 w-7"
    >
      {ICON_PATHS[icon]}
    </svg>
  );
}

const CONTACT_TILES = [
  {
    title: "Club Welfare",
    summary: "Any safeguarding or welfare concerns, in confidence.",
    email: "holcombefc_welfare@yahoo.com",
    icon: "heart" as const,
  },
  {
    title: "The Club",
    summary: "General questions, registrations, and everything else.",
    email: "holcombeyfc@gmail.com",
    icon: "mail" as const,
  },
];

const KEY_PEOPLE = [
  { name: "Luke Clarke", role: "Chairman" },
  { name: "Paul Garbutt", role: "Secretary" },
  { name: "Rebecca Walker", role: "Welfare Officer" },
  { name: "Brian Nagel", role: "Treasury Officer" },
];

export default async function ContactsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/contacts");
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-8">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          Key contacts
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Who to speak to, and how to reach them.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CONTACT_TILES.map((c) => (
          <a
            key={c.email}
            href={`mailto:${c.email}`}
            className="glass rounded-2xl p-5 flex items-start gap-4 hover:bg-white/[0.08] transition-colors group"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue/20 text-accent group-hover:scale-105 transition-transform">
              <ContactIcon icon={c.icon} />
            </span>
            <span>
              <span className="block font-semibold text-white">{c.title}</span>
              <span className="mt-0.5 block text-sm text-white/55">
                {c.summary}
              </span>
              <span className="mt-2 inline-block text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide text-accent">
                {c.email}
              </span>
            </span>
          </a>
        ))}
      </div>

      <section>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          Key people
        </h2>
        <GlassCard className="divide-y divide-white/5">
          {KEY_PEOPLE.map((p) => (
            <div
              key={p.name}
              className="flex items-center justify-between gap-3 px-5 py-3.5"
            >
              <span className="text-white font-semibold">{p.name}</span>
              <span className="text-sm text-white/55 font-(family-name:--font-ui-mono)">
                {p.role}
              </span>
            </div>
          ))}
        </GlassCard>
      </section>

      <p className="text-xs text-white/40">
        Not sure who to ask? Send it to{" "}
        <a
          href="mailto:holcombeyfc@gmail.com"
          className="text-accent hover:underline"
        >
          holcombeyfc@gmail.com
        </a>{" "}
        and we&apos;ll point you the right way.
      </p>
    </div>
  );
}
