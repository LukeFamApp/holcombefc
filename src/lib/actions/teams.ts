"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";

export async function addTeam(formData: FormData) {
  const supabase = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const ageGroup = String(formData.get("ageGroup") ?? "").trim();
  if (!name || !ageGroup) return;

  await supabase.from("teams").insert({ name, age_group: ageGroup });
  revalidatePath("/admin/teams");
}

export async function updateTeam(formData: FormData) {
  const supabase = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const ageGroup = String(formData.get("ageGroup") ?? "").trim();
  if (!id || !name || !ageGroup) return;

  await supabase.from("teams").update({ name, age_group: ageGroup }).eq("id", id);
  revalidatePath("/admin/teams");
}

export async function deleteTeam(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/admin/teams");
}

export async function movePlayerToTeam(formData: FormData) {
  const supabase = await requireAdmin();

  const playerId = String(formData.get("playerId") ?? "");
  const teamId = String(formData.get("teamId") ?? "");
  if (!playerId || !teamId) return;

  await supabase.from("players").update({ team_id: teamId }).eq("id", playerId);
  revalidatePath("/admin");
}

export async function addFeePlan(formData: FormData) {
  const supabase = await requireAdmin();

  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const annualPrice = Number(formData.get("annualPricePounds"));
  const instalmentsRaw = String(formData.get("instalmentCount") ?? "").trim();
  const instalments = instalmentsRaw ? Number(instalmentsRaw) : null;

  if (!teamId || !name || !Number.isFinite(annualPrice) || annualPrice < 0) {
    return;
  }
  if (
    instalments !== null &&
    (!Number.isInteger(instalments) || instalments < 2 || instalments > 12)
  ) {
    return;
  }

  await supabase.from("fee_plans").insert({
    team_id: teamId,
    name,
    annual_price_pence: Math.round(annualPrice * 100),
    instalment_count: instalments,
  });
  revalidatePath("/admin/teams");
}

export async function deleteFeePlan(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("fee_plans").delete().eq("id", id);
  revalidatePath("/admin/teams");
}
