import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateParentProfile, requestEmailChange } from "@/lib/actions/account";
import { updatePassword } from "@/lib/actions/password-reset";
import { GlassCard, Field, Button, ErrorNote } from "@/components/ui";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    updated?: string;
    emailChangeRequested?: string;
    passwordUpdated?: string;
  }>;
}) {
  const { error, updated, emailChangeRequested, passwordUpdated } =
    await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("first_name, last_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12 flex flex-col gap-8">
      <div>
        <h1 className="font-(family-name:--font-display) text-3xl sm:text-4xl text-white">
          My account
        </h1>
        <p className="text-white/50 text-sm mt-1">
          Your own details — separate from your players.
        </p>
      </div>

      <ErrorNote message={error} />
      {updated && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          Your details have been updated.
        </p>
      )}
      {emailChangeRequested && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          Check your new email address — click the confirmation link there to
          finish changing it. Until then, you&apos;ll keep logging in with
          your current email.
        </p>
      )}
      {passwordUpdated && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3.5 py-2.5 text-sm text-accent">
          Your password has been updated.
        </p>
      )}

      {/* Name + phone */}
      <GlassCard strong className="p-5 sm:p-8">
        <h2 className="font-(family-name:--font-display) text-2xl text-white mb-1">
          Your details
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Shown to the club alongside your players.
        </p>
        <form action={updateParentProfile} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First name"
              name="firstName"
              defaultValue={parent?.first_name ?? ""}
              required
            />
            <Field
              label="Last name"
              name="lastName"
              defaultValue={parent?.last_name ?? ""}
              required
            />
          </div>
          <Field
            label="Phone"
            name="phone"
            type="tel"
            defaultValue={parent?.phone ?? ""}
          />
          <Button className="mt-2 self-start">Save details</Button>
        </form>
      </GlassCard>

      {/* Email */}
      <GlassCard strong className="p-5 sm:p-8">
        <h2 className="font-(family-name:--font-display) text-2xl text-white mb-1">
          Email address
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Currently <span className="text-white/80">{user.email}</span>. Changing
          it sends a confirmation link to the new address — it only takes
          effect once you click that.
        </p>
        <form action={requestEmailChange} className="flex flex-col gap-4">
          <Field label="New email address" name="email" type="email" required />
          <Button variant="ghost" className="self-start">
            Send confirmation link
          </Button>
        </form>
      </GlassCard>

      {/* Password */}
      <GlassCard strong className="p-5 sm:p-8">
        <h2 className="font-(family-name:--font-display) text-2xl text-white mb-1">
          Password
        </h2>
        <p className="text-white/50 text-sm mb-6">
          Set a new password without needing an email link.
        </p>
        <form action={updatePassword} className="flex flex-col gap-4">
          <input type="hidden" name="errorReturnTo" value="/account" />
          <input
            type="hidden"
            name="successReturnTo"
            value="/account?passwordUpdated=1"
          />
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
          <Button variant="ghost" className="self-start">
            Update password
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
