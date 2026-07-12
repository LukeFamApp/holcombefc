import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: parent } = await supabase
      .from("parents")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    isAdmin = parent?.is_admin ?? false;
  }

  return (
    <header className="sticky top-0 z-50 glass border-x-0 border-t-0">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/badge.png"
            alt="Holcombe FC badge"
            width={36}
            height={36}
            className="h-9 w-9"
            priority
          />
          <span className="font-(family-name:--font-display) text-2xl tracking-wide text-white">
            HOLCOMBE <span className="text-accent">FC</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 font-(family-name:--font-ui-mono) text-sm">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                Dashboard
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Admin
                </Link>
              )}
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-accent px-3.5 py-1.5 font-semibold text-black hover:bg-accent-dim hover:text-white transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
