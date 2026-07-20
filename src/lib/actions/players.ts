"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CURRENT_SEASON } from "@/lib/config";
import {
  createBillingRequestFlowForPayment,
  friendlyGoCardlessError,
} from "@/lib/payments";

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
  const heartConditions = optional(formData, "heartConditions");
  const photoConsent = text(formData, "photoConsent") === "yes";
  const cocAccepted = formData.get("cocAccepted") === "on";
  const paymentMethod = text(formData, "paymentMethod") === "monthly" ? "monthly" : "full";

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
    .select("id, name, annual_price_pence, instalment_count")
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
      heart_conditions: heartConditions,
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

  // Registration is confirmed immediately — payment is set up right after,
  // as one continuous journey rather than a step a parent can wander off
  // from.
  const { data: registration, error: regError } = await supabase
    .from("registrations")
    .insert({
      player_id: player.id,
      fee_plan_id: feePlanId,
      season: CURRENT_SEASON,
      status: "active",
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

  const { data: paymentRow, error: paymentError } = await supabase
    .from("payments")
    .insert({
      registration_id: registration.id,
      amount_pence: feePlan.annual_price_pence,
      status: "pending",
    })
    .select("id")
    .single();

  if (paymentError || !paymentRow) {
    redirect(
      `/register?error=${encodeURIComponent(
        "Your player was registered, but we couldn't set up payment — please try again from your dashboard.",
      )}`,
    );
  }

  const { data: parentRow } = await supabase
    .from("parents")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  revalidatePath("/dashboard");

  let authorisationUrl: string;
  try {
    authorisationUrl = await createBillingRequestFlowForPayment({
      paymentId: paymentRow.id,
      registrationId: registration.id,
      method: paymentMethod,
      parent: parentRow,
    });
  } catch (err) {
    redirect(
      `/pay/${registration.id}?error=${encodeURIComponent(friendlyGoCardlessError(err))}`,
    );
  }

  redirect(authorisationUrl);
}

export async function requestPlayerRemoval(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const playerId = text(formData, "playerId");
  const reason = optional(formData, "reason");
  if (!playerId) {
    redirect("/dashboard");
  }

  // Don't stack duplicate requests if one's already pending.
  const { data: existing } = await supabase
    .from("player_removal_requests")
    .select("id")
    .eq("player_id", playerId)
    .eq("status", "pending")
    .maybeSingle();

  if (!existing) {
    await supabase.from("player_removal_requests").insert({
      player_id: playerId,
      requested_by: user.id,
      reason,
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?removalRequested=1");
}
