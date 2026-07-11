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

  const fullName = String(formData.get("fullName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "");
  const teamId = String(formData.get("teamId") ?? "") || null;
  const emergencyContactName = String(
    formData.get("emergencyContactName") ?? "",
  ).trim();
  const emergencyContactPhone = String(
    formData.get("emergencyContactPhone") ?? "",
  ).trim();
  const medicalNotes = String(formData.get("medicalNotes") ?? "").trim() || null;

  if (!fullName || !dateOfBirth || !emergencyContactName || !emergencyContactPhone) {
    redirect(
      `/register?error=${encodeURIComponent(
        "Please fill in all required fields.",
      )}`,
    );
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      parent_id: user.id,
      full_name: fullName,
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
    .insert({ player_id: player.id, season: CURRENT_SEASON, status: "pending" })
    .select("id")
    .single();

  if (regError || !registration) {
    redirect(
      `/register?error=${encodeURIComponent(
        regError?.message ?? "Could not create registration.",
      )}`,
    );
  }

  await supabase
    .from("payments")
    .insert({ registration_id: registration.id, status: "pending" });

  revalidatePath("/register");
  redirect("/register?success=1");
}
