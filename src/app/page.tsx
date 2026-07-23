import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { GlassCard } from "@/components/ui";
import { CURRENT_SEASON } from "@/lib/config";

const CONTACT_EMAIL = "holcombeyfc@gmail.com";
const FACEBOOK_URL = "https://www.facebook.com/HolcombeYFC";

type Team = {
  id: string;
  name: string;
  age_group: string;
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, age_group")
    .order("age_group")
    .returns<Team[]>();

  return (
    <div className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex justify-center"
        >
          <div className="h-[520px] w-[520px] rounded-full bg-blue/20 blur-[130px]" />
        </div>

        {/* Pitch markings backdrop */}
        <svg
          aria-hidden
          viewBox="0 0 1200 500"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.14]"
          preserveAspectRatio="xMidYMid slice"
        >
          <line x1="600" y1="0" x2="600" y2="500" stroke="var(--color-accent)" strokeWidth="2" />
          <circle cx="600" cy="250" r="110" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
          <circle cx="600" cy="250" r="4" fill="var(--color-accent)" />
          <path d="M 0 130 a 120 120 0 0 1 0 240" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
          <path d="M 1200 130 a 120 120 0 0 0 0 240" fill="none" stroke="var(--color-accent)" strokeWidth="2" />
        </svg>

        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/badge.png"
            alt="Holcombe FC badge"
            width={128}
            height={128}
            priority
            className="mb-6 h-28 w-28 drop-shadow-[0_0_40px_rgba(38,87,217,0.45)]"
          />
          <p className="mb-3 font-(family-name:--font-ui-mono) text-xs uppercase tracking-[0.3em] text-accent">
            Grassroots Football Club
          </p>
          <h1 className="font-(family-name:--font-display) text-5xl leading-none text-white sm:text-7xl">
            Holcombe FC
          </h1>
          <p className="mt-5 max-w-xl text-balance text-white/60">
            Register your child for the {CURRENT_SEASON} season in a couple
            of minutes. One form, one place to keep track of your player.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-6 py-3 font-semibold text-black shadow-[0_0_30px_rgba(227,222,26,0.3)] transition-colors hover:bg-accent-dim"
            >
              Register your player
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              I already have an account
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="rounded-lg border border-white/15 px-6 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              Contact us
            </a>
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
              body: "Name, date of birth, team and emergency contact details.",
            },
            {
              step: "03",
              title: "We take it from there",
              body: "Your registration is confirmed straight away, and you're all set for the season.",
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

      {/* New players welcome */}
      {teams && teams.length > 0 && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-3xl">
            <GlassCard strong className="p-8 text-center">
              <h2 className="font-(family-name:--font-display) text-3xl text-white mb-2">
                New players welcome
              </h2>
              <p className="text-white/60 max-w-lg mx-auto">
                Please{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-accent hover:underline"
                >
                  contact us
                </a>{" "}
                for details — we have spaces in the following teams:
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {teams.map((t) => (
                  <span
                    key={t.id}
                    className="glass rounded-full px-4 py-2 text-sm font-(family-name:--font-ui-mono) text-white/75"
                  >
                    {t.name} ({t.age_group})
                  </span>
                ))}
              </div>
            </GlassCard>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center text-sm text-white/40">
          <Image
            src="/badge.png"
            alt="Holcombe FC badge"
            width={40}
            height={40}
            className="h-10 w-10 opacity-80"
          />
          <div className="flex items-center gap-4 font-(family-name:--font-ui-mono) text-xs uppercase tracking-wide">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-white/50 hover:text-accent transition-colors"
            >
              Contact us
            </a>
            <span className="text-white/20">·</span>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/50 hover:text-accent transition-colors"
            >
              Facebook
            </a>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Holcombe FC. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
