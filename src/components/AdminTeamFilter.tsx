import Link from "next/link";

type Team = { id: string; name: string; age_group: string };

export function AdminTeamFilter({
  teams,
  activeTeamId,
  basePath,
}: {
  teams: Team[];
  activeTeamId?: string;
  basePath: string;
}) {
  const pillClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide transition-colors ${
      active
        ? "border-accent bg-accent/15 text-accent"
        : "border-white/15 text-white/60 hover:bg-white/10"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={basePath} className={pillClass(!activeTeamId)}>
        All teams
      </Link>
      {teams.map((t) => (
        <Link
          key={t.id}
          href={`${basePath}?team=${t.id}`}
          className={pillClass(activeTeamId === t.id)}
        >
          {t.name} ({t.age_group})
        </Link>
      ))}
    </div>
  );
}
