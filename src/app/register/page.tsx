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
  fee_plans: { id: string; name: string; annual_price_pence: number }[];
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

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, age_group, fee_plans ( id, name, annual_price_pence )")
    .order("age_group")
    .returns<TeamRow[]>();

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

      <GlassCard strong className="p-5 sm:p-8">
        <AddPlayerForm teams={teams ?? []} />
      </GlassCard>

      <p className="text-xs text-white/40 text-center">
        No payment is taken now — we&apos;ll be in touch about fees once your
        registration is confirmed.
      </p>
    </div>
  );
}
