import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GlassCard, StatusPill } from "@/components/ui";
import { CURRENT_SEASON } from "@/lib/config";

type RegistrationRow = {
  id: string;
  season: string;
  status: string;
  fee_plans: { name: string; annual_price_pence: number } | null;
  payments: { status: string; method: string | null }[] | null;
};

type PlayerRow = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  photo_consent: boolean;
  teams: { name: string; age_group: string } | null;
  registrations: RegistrationRow[] | null;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; payment?: string }>;
}) {
  const { registered, payment } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const [{ data: parent }, { data: players }] = await Promise.all([
    supabase.from("parents").select("first_name").eq("id", user.id).single(),
    supabase
      .from("players")
      .select(
        `id, first_name, last_name, date_of_birth, photo_consent,
         teams ( name, age_group ),
         registrations ( id, season, status, fee_plans ( name, annual_price_pence ), payments ( status, method ) )`,
      )
      .order("created_at", { ascending: false })
      .returns<PlayerRow[]>(),
  ]);

  const firstName = parent?.first_name || "there";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-8">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          Hi {firstName} 👋
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Season {CURRENT_SEASON} · your Holcombe FC home
        </p>
      </div>

      {registered && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          All done — your child is registered for {CURRENT_SEASON}.
        </p>
      )}
      {payment === "setup" && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          Your Direct Debit is set up — you&apos;re all sorted. Payments will
          show as collected once your bank confirms them.
        </p>
      )}

      {/* Players */}
      <section>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          My players
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(players ?? []).map((p) => {
            const reg = p.registrations?.find(
              (r) => r.season === CURRENT_SEASON,
            );
            const paymentStatus = reg?.payments?.[0]?.status ?? "not_required";
            return (
              <GlassCard key={p.id} className="p-5">
                <h3 className="font-semibold text-white text-lg">
                  {p.first_name} {p.last_name}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  {p.teams ? `${p.teams.name} · ` : ""}DOB {p.date_of_birth}
                </p>
                {reg?.fee_plans && (
                  <p className="text-xs text-white/50 mt-0.5">
                    {reg.fee_plans.name} · £
                    {(reg.fee_plans.annual_price_pence / 100).toFixed(0)}/yr
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {reg && <StatusPill status={reg.status} />}
                  <StatusPill status={paymentStatus} kind="payment" />
                </div>
                {reg &&
                  ["pending", "failed", "cancelled"].includes(paymentStatus) && (
                    <Link
                      href={`/pay/${reg.id}`}
                      className="mt-4 block w-full rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-semibold text-black hover:bg-accent-dim transition-colors"
                    >
                      {paymentStatus === "pending"
                        ? "Set up your club fees"
                        : "Set up a new Direct Debit"}
                    </Link>
                  )}
                {reg &&
                  reg.payments?.[0]?.method &&
                  paymentStatus !== "pending" && (
                    <Link
                      href={`/payments/${reg.id}`}
                      className="mt-3 block text-center text-xs font-(family-name:--font-ui-mono) uppercase tracking-wide text-white/50 hover:text-accent transition-colors"
                    >
                      Payment history →
                    </Link>
                  )}
              </GlassCard>
            );
          })}

          {/* Add-a-child widget */}
          <Link
            href="/register"
            className="glass rounded-2xl p-5 flex flex-col items-center justify-center gap-2 min-h-[132px] text-center hover:bg-white/[0.08] transition-colors group"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black text-3xl font-bold leading-none group-hover:scale-110 transition-transform">
              +
            </span>
            <span className="text-sm font-semibold text-white">
              Add a child
            </span>
            <span className="text-xs text-white/45">
              Register a player for {CURRENT_SEASON}
            </span>
          </Link>
        </div>
      </section>

      {/* Club policies widget */}
      <section>
        <h2 className="font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.2em] text-white/40 mb-3">
          Club documents
        </h2>
        <GlassCard className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-white">Policies &amp; codes of conduct</h3>
              <p className="text-sm text-white/50 mt-1 max-w-md">
                Our codes of conduct, safeguarding policy and other club
                documents — everything you accepted when registering, in one
                place.
              </p>
            </div>
            <Link
              href="/policies"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              View policies
            </Link>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
