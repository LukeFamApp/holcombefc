import { login } from "@/lib/actions/auth";
import { GlassCard, Field, Button, ErrorNote } from "@/components/ui";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const { error, redirect } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <GlassCard strong className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="font-(family-name:--font-display) text-3xl text-white mb-1">
          Welcome back
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Log in to manage your players.
        </p>
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirect ?? "/dashboard"} />
          <ErrorNote message={error} />
          <Field label="Email" name="email" type="email" required />
          <Field label="Password" name="password" type="password" required />
          <Button className="mt-2 w-full">Log in</Button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          No account yet?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
