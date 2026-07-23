import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePassword } from "@/lib/actions/password-reset";
import { GlassCard, Field, Button, ErrorNote } from "@/components/ui";

export default async function ResetPasswordPage({
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
    redirect(
      `/login?error=${encodeURIComponent(
        "That reset link has expired — please request a new one.",
      )}`,
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <GlassCard strong className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="font-(family-name:--font-display) text-3xl text-white mb-1">
          Set a new password
        </h1>
        <p className="text-white/50 text-sm mb-6">
          Choose a new password for {user.email}.
        </p>
        <form action={updatePassword} className="flex flex-col gap-4">
          <ErrorNote message={error} />
          <Field
            label="New password"
            name="password"
            type="password"
            required
            placeholder="At least 8 characters"
          />
          <Field
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            required
            placeholder="Retype your password"
          />
          <Button className="mt-2 w-full">Update password</Button>
        </form>
      </GlassCard>
    </div>
  );
}
