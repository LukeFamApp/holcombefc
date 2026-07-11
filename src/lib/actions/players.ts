"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/config";

export async function addPlayer(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/register");
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const teamId = String(formData.get("teamId") ?? "").trim();
  const feePlanId = String(formData.get("feePlanId") ?? "").trim();
  const emergencyContactName = String(
    formData.get("emergencyContactName") ?? "",
  ).trim();
  const emergencyContactPhone = String(
    formData.get("emergencyContactPhone") ?? "",
  ).trim();
  const medicalNotes = String(formData.get("medicalNotes") ?? "").trim() || null;

  if (
    !firstName ||
    !lastName ||
    !dateOfBirth ||
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
      team_id: teamId,
      emergency_contact_name: emergencyContactName,
      emergency_contact_phone: emergencyContactPhone,
      medical_notes: medicalNotes,
    })
    .select("id")
    .single();

  if (playerError || !player) {
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

  revalidatePath("/register");
  redirect("/register?success=1");
}
