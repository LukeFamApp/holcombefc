import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard, ErrorNote } from "@/components/ui";
import AddPlayerForm from "@/components/AddPlayerForm";
import { CURRENT_SEASON } from "@/lib/config";

type TeamRow = {
  id: string;
  name: string;
  age_group: string;
  fee_plans: {
    id: string;
    name: string;
    annual_price_pence: number;
    instalment_count: number | null;
  }[];
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/register");
  }

  const [{ data: teams }, { data: existingPlayers }] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id, name, age_group, fee_plans ( id, name, annual_price_pence, instalment_count )",
      )
      .order("age_group")
      .returns<TeamRow[]>(),
    supabase.from("players").select("id").eq("parent_id", user.id),
  ]);

  let siblingDiscountEligible = false;
  const playerIds = (existingPlayers ?? []).map((p) => p.id);
  if (playerIds.length > 0) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("season", CURRENT_SEASON)
      .eq("status", "active")
      .in("player_id", playerIds);
    siblingDiscountEligible = (count ?? 0) > 0;
  }

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
          Register a player
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Season {CURRENT_SEASON} · takes about 2 minutes
        </p>
      </div>

      <ErrorNote message={error} />

      {siblingDiscountEligible && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          You already have a player registered this season — this one gets a
          10% sibling discount automatically.
        </p>
      )}

      <GlassCard strong className="p-5 sm:p-8">
        <AddPlayerForm
          teams={teams ?? []}
          siblingDiscountEligible={siblingDiscountEligible}
        />
      </GlassCard>

      <p className="text-xs text-white/40 text-center">
        The last step sets up how you&apos;ll pay — in full or by monthly
        Direct Debit — securely with GoCardless.
      </p>
    </div>
  );
}
