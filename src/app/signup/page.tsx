import { signup } from "@/lib/actions/auth";
import { GlassCard, Field, Button, ErrorNote } from "@/components/ui";
import Link from "next/link";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <GlassCard strong className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="font-(family-name:--font-display) text-3xl text-white mb-1">
          Create your account
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Set up a parent account to register your child.
        </p>
        <form action={signup} className="flex flex-col gap-4">
          <ErrorNote message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
          </div>
          <Field label="Email" name="email" type="email" required />
          <Field label="Phone" name="phone" type="tel" />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            placeholder="At least 8 characters"
          />
          <Field
            label="Confirm password"
            name="confirmPassword"
            type="password"
            required
            placeholder="Retype your password"
          />
          <Button className="mt-2 w-full">Sign up</Button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          Already registered?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
