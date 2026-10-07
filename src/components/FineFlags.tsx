import { FINE_FLAGGED_STATUSES, FINE_UNPAID_STATUSES } from "@/lib/config";

export type PlayerFine = {
  id?: string;
  card_type: string;
  status: string;
  amount_pence?: number;
};

const pounds = (pence: number) =>
  pence % 100 === 0 ? `£${pence / 100}` : `£${(pence / 100).toFixed(2)}`;

// One badge per outstanding fine against a player. Renders nothing once a
// fine is paid or withdrawn — that's what "removing the flag" means.
export function FineFlags({ fines }: { fines: PlayerFine[] | null | undefined }) {
  const flagged = (fines ?? []).filter((f) =>
    FINE_FLAGGED_STATUSES.includes(f.status),
  );
  if (flagged.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {flagged.map((f, i) => {
        const unpaid = FINE_UNPAID_STATUSES.includes(f.status);
        const yellow = f.card_type === "yellow";
        return (
          <span
            key={f.id ?? i}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide ${
              yellow
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <span
              className={`inline-block h-2.5 w-1.5 rounded-[1px] ${
                yellow ? "bg-accent" : "bg-red-400"
              }`}
            />
            {yellow ? "Yellow" : "Red"} card
            {f.amount_pence ? ` ${pounds(f.amount_pence)}` : ""} ·{" "}
            {unpaid ? "unpaid" : "payment in progress"}
          </span>
        );
      })}
    </div>
  );
}
