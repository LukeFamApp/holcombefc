"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function updateParentProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/account");
  }

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const phone = text(formData, "phone") || null;

  if (!firstName || !lastName) {
    redirect(
      `/account?error=${encodeURIComponent(
        "First and last name can't be blank.",
      )}`,
    );
  }

  const { error } = await supabase
    .from("parents")
    .update({ first_name: firstName, last_name: lastName, phone })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/account?error=${encodeURIComponent(
        "Could not update your details — please try again.",
      )}`,
    );
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  redirect("/account?updated=1");
}

export async function requestEmailChange(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/account");
  }

  const newEmail = text(formData, "email").toLowerCase();
  if (!newEmail || !newEmail.includes("@")) {
    redirect(
      `/account?error=${encodeURIComponent("Please enter a valid email address.")}`,
    );
  }
  if (newEmail === user.email) {
    redirect(
      `/account?error=${encodeURIComponent("That's already your email address.")}`,
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: `${siteUrl}/auth/callback?redirect=${encodeURIComponent("/account")}`,
    },
  );

  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/account?emailChangeRequested=1");
}
