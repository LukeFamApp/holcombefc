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

export async function deleteTeam(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase.from("teams").delete().eq("id", id);
  revalidatePath("/admin/teams");
}

export async function addFeePlan(formData: FormData) {
  const supabase = await requireAdmin();

  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const annualPrice = Number(formData.get("annualPricePounds"));

  if (!teamId || !name || !Number.isFinite(annualPrice) || annualPrice < 0) {
    return;
  }

  await supabase.from("fee_plans").insert({
    team_id: teamId,
    name,
    annual_price_pence: Math.round(annualPrice * 100),
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
