const ICON_PATHS: Record<string, React.ReactNode> = {
  // Heroicons-style 24x24 outline paths
  shield: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
    />
  ),
  clipboard: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-9M10.125 2.25h.375a9 9 0 0 1 9 9v.375M10.125 2.25A3.375 3.375 0 0 1 13.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 0 1 3.375 3.375M9 15l2.25 2.25L15 12"
    />
  ),
  player: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"
    />
  ),
  parents: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
    />
  ),
  whistle: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
    />
  ),
  megaphone: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46"
    />
  ),
  scales: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z"
    />
  ),
  heart: (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
    />
  ),
};

const POLICIES: {
  title: string;
  summary: string;
  file: string;
  icon: keyof typeof ICON_PATHS;
}[] = [
  {
    title: "Safeguarding Declaration",
    summary: "Our club's safeguarding commitment for youth football.",
    file: "safeguarding-declaration.pdf",
    icon: "shield",
  },
  {
    title: "FA Safeguarding Children Policy",
    summary: "How children are kept safe, and how to raise a concern.",
    file: "fa-safeguarding-children-policy.pdf",
    icon: "heart",
  },
  {
    title: "Code of Conduct — Young Players",
    summary: "What we ask of every player, on and off the pitch.",
    file: "code-of-conduct-players.pdf",
    icon: "player",
  },
  {
    title: "Code of Conduct — Parents & Spectators",
    summary: "Keeping the touchline positive and supportive.",
    file: "code-of-conduct-parents.pdf",
    icon: "parents",
  },
  {
    title: "Code of Conduct — Coaches & Officials",
    summary: "The standards our coaches and club officials work to.",
    file: "code-of-conduct-coaches.pdf",
    icon: "clipboard",
  },
  {
    title: "Code of Conduct — Match Officials",
    summary: "Respect for, and the responsibilities of, match officials.",
    file: "code-of-conduct-match-officials.pdf",
    icon: "whistle",
  },
  {
    title: "The Grassroots Code",
    summary: "The FA's code for everyone in grassroots football.",
    file: "grassroots-code.pdf",
    icon: "megaphone",
  },
  {
    title: "FA Equality Policy",
    summary: "Football for everyone — our commitment to equality.",
    file: "fa-equality-policy.pdf",
    icon: "scales",
  },
];

function PolicyIcon({ icon }: { icon: keyof typeof ICON_PATHS }) {
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

export default function PoliciesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-6">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          Club policies
        </h1>
        <p className="text-white/50 text-sm mt-1">
          The documents every Holcombe FC family signs up to. Tap one to read
          it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {POLICIES.map((p) => (
          <a
            key={p.file}
            href={`/policies/${p.file}`}
            target="_blank"
            rel="noopener"
            className="glass rounded-2xl p-5 flex items-start gap-4 hover:bg-white/[0.08] transition-colors group"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue/20 text-accent group-hover:scale-105 transition-transform">
              <PolicyIcon icon={p.icon} />
            </span>
            <span>
              <span className="block font-semibold text-white">{p.title}</span>
              <span className="mt-0.5 block text-sm text-white/55">
                {p.summary}
              </span>
              <span className="mt-2 inline-block text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide text-accent">
                Read →
              </span>
            </span>
          </a>
        ))}
      </div>

      <p className="text-xs text-white/40">
        Questions about any of these? Speak to your team&apos;s coach or the
        club committee.
      </p>
    </div>
  );
}
