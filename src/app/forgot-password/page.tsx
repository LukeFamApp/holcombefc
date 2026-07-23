import { requestPasswordReset } from "@/lib/actions/password-reset";
import { GlassCard, Field, Button, ErrorNote } from "@/components/ui";
import Link from "next/link";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <GlassCard strong className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="font-(family-name:--font-display) text-3xl text-white mb-1">
          Reset your password
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Enter the email you signed up with and we&apos;ll send you a link
          to set a new password.
        </p>
        <form action={requestPasswordReset} className="flex flex-col gap-4">
          <ErrorNote message={error} />
          <Field label="Email" name="email" type="email" required />
          <Button className="mt-2 w-full">Send reset link</Button>
        </form>
        <p className="mt-6 text-center text-sm text-white/50">
          Remembered it after all?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
        </p>
      </GlassCard>
    </div>
  );
}
