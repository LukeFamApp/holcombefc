"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect(
      `/forgot-password?error=${encodeURIComponent("Please enter your email address.")}`,
    );
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Don't branch on the result — Supabase already returns success
  // regardless of whether the email is registered, so a genuine parent
  // and someone probing for accounts see exactly the same response.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?redirect=${encodeURIComponent("/reset-password")}`,
  });

  redirect("/forgot-password/check-email");
}

// Shared by the recovery-link flow (/reset-password, no prior session
// needed beyond the one the link itself grants) and the account page
// (/account, changing your password while already logged in) — both just
// need *a* valid session, however it was established.
export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  // Two separate targets, not one: a recovery-link user should land on
  // /dashboard afterward, but someone changing their password from
  // /account should stay on /account — while both send errors back to
  // wherever the form actually was.
  const errorReturnTo = String(formData.get("errorReturnTo") ?? "/reset-password");
  const successReturnTo = String(
    formData.get("successReturnTo") ?? "/dashboard?passwordReset=1",
  );

  if (password.length < 8) {
    redirect(
      `${errorReturnTo}?error=${encodeURIComponent(
        "Password must be at least 8 characters.",
      )}`,
    );
  }
  if (password !== confirmPassword) {
    redirect(
      `${errorReturnTo}?error=${encodeURIComponent(
        "The two passwords don't match — please retype them.",
      )}`,
    );
  }

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

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`${errorReturnTo}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(successReturnTo);
}
