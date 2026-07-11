import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui";
import { CURRENT_SEASON } from "@/lib/config";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, age_group")
    .order("age_group");

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex justify-center"
        >
          <div className="h-[480px] w-[480px] rounded-full bg-accent/10 blur-[120px]" />
        </div>

        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] font-(family-name:--font-display) text-2xl tracking-widest text-accent shadow-[0_0_40px_rgba(41,209,122,0.15)]">
            HFC
          </div>
          <p className="mb-3 font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.3em] text-accent">
            Grassroots Football Club
          </p>
          <h1 className="font-(family-name:--font-display) text-5xl leading-none text-white sm:text-7xl">
            Holcombe FC
          </h1>
          <p className="mt-5 max-w-xl text-balance text-white/60">
            Register your child for the {CURRENT_SEASON} season in a couple
            of minutes. One form, one place to keep track of your player and
            your club fees.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(41,209,122,0.3)] transition-colors hover:bg-accent-dim hover:text-white"
            >
              Register your player
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Create an account",
              body: "Sign up with your email in under a minute — no app to download.",
            },
            {
              step: "02",
              title: "Add your player",
              body: "Name, date of birth, team and emergency contact — that's it.",
            },
            {
              step: "03",
              title: "We take it from there",
              body: "Your registration lands with the club committee, and we'll be in touch about fees.",
            },
          ].map((s) => (
            <GlassCard key={s.step} className="p-6">
              <span className="font-(family-name:--font-display) text-3xl text-accent">
                {s.step}
              </span>
              <h3 className="mt-2 font-semibold text-white">{s.title}</h3>
              <p className="mt-1 text-sm text-white/55">{s.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Teams */}
      {teams && teams.length > 0 && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-(family-name:--font-display) text-3xl text-white mb-6 text-center">
              Our Teams
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {teams.map((t) => (
                <span
                  key={t.id}
                  className="glass rounded-full px-4 py-2 text-sm font-(family-name:--font-ui-mono) text-white/75"
                >
                  {t.age_group}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-sm text-white/40">
          <p className="font-(family-name:--font-display) text-lg tracking-wide text-white/70">
            HOLCOMBE <span className="text-accent">FC</span>
          </p>
          <p>
            &copy; {new Date().getFullYear()} Holcombe FC. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
