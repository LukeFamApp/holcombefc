"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/config";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string): string | null {
  return text(formData, key) || null;
}

export async function addPlayer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/register");
  }

  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const dateOfBirth = text(formData, "dateOfBirth");
  const addressLine1 = text(formData, "addressLine1");
  const addressLine2 = optional(formData, "addressLine2");
  const addressTown = text(formData, "addressTown");
  const addressPostcode = text(formData, "addressPostcode");
  const teamId = text(formData, "teamId");
  const feePlanId = text(formData, "feePlanId");
  const emergencyContactName = text(formData, "emergencyContactName");
  const emergencyContactPhone = text(formData, "emergencyContactPhone");
  const medicalConditions = optional(formData, "medicalConditions");
  const allergies = optional(formData, "allergies");
  const medications = optional(formData, "medications");
  const photoConsent = text(formData, "photoConsent") === "yes";
  const cocAccepted = formData.get("cocAccepted") === "on";

  if (
    !firstName ||
    !lastName ||
    !dateOfBirth ||
    !addressLine1 ||
    !addressTown ||
    !addressPostcode ||
    !teamId ||
    !feePlanId ||
    !emergencyContactName ||
    !emergencyContactPhone
  ) {
    redirect(
      `/register?error=${encodeURIComponent(
        "Please fill in all required fields.",
      )}`,
    );
  }

  if (!cocAccepted) {
    redirect(
      `/register?error=${encodeURIComponent(
        "You need to accept the club's codes of conduct to register.",
      )}`,
    );
  }

  // Same child already registered? Treat a repeat submission as success —
  // this absorbs double-taps and back-button resubmits gracefully.
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("parent_id", user.id)
    .ilike("first_name", firstName)
    .ilike("last_name", lastName)
    .eq("date_of_birth", dateOfBirth)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard?registered=1");
  }

  // Confirm the chosen fee plan actually belongs to the chosen team, and
  // grab its price so the payment record snapshots what was offered at the
  // time of registration (not whatever the plan costs later).
  const { data: feePlan, error: feePlanError } = await supabase
    .from("fee_plans")
    .select("id, annual_price_pence")
    .eq("id", feePlanId)
    .eq("team_id", teamId)
    .single();

  if (feePlanError || !feePlan) {
    redirect(
      `/register?error=${encodeURIComponent(
        "That fee plan doesn't match the selected team — please try again.",
      )}`,
    );
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      parent_id: user.id,
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      address_line1: addressLine1,
      address_line2: addressLine2,
      address_town: addressTown,
      address_postcode: addressPostcode,
      team_id: teamId,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      medical_conditions: medicalConditions,
      allergies,
      medications,
      photo_consent: photoConsent,
      coc_accepted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (playerError || !player) {
    // 23505 = unique violation from the players_unique_child_per_parent
    // index — a concurrent duplicate submission beat us to it.
    if (playerError?.code === "23505") {
      redirect("/dashboard?registered=1");
    }
    redirect(
      `/register?error=${encodeURIComponent(
        playerError?.message ?? "Could not save player.",
      )}`,
    );
  }

  const { data: registration, error: regError } = await supabase
    .from("registrations")
    .insert({
      player_id: player.id,
      fee_plan_id: feePlanId,
      season: CURRENT_SEASON,
      status: "pending",
    })
    .select("id")
    .single();

  if (regError || !registration) {
    redirect(
      `/register?error=${encodeURIComponent(
        regError?.message ?? "Could not create registration.",
      )}`,
    );
  }

  await supabase.from("payments").insert({
    registration_id: registration.id,
    amount_pence: feePlan.annual_price_pence,
    status: "pending",
  });

  revalidatePath("/dashboard");
  redirect("/dashboard?registered=1");
}
