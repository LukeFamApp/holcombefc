"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { cancelMandate } from "@/lib/gocardless";

// Approving deletes the player outright (registrations/payments/collections
// cascade); the request row cascades away with it, so there's nothing left
// to mark "approved" — the player's absence is the record. Rejecting keeps
// the request as a rejected row so the parent can see the outcome and,
// if needed, submit a fresh request later.
export async function resolvePlayerRemoval(formData: FormData) {
  const supabase = await requireAdmin();

  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!requestId || (decision !== "approve" && decision !== "reject")) return;

  const { data: request } = await supabase
    .from("player_removal_requests")
    .select("id, player_id")
    .eq("id", requestId)
    .single();
  if (!request) return;

  if (decision === "approve") {
    // If there's a live Direct Debit (a monthly plan still collecting, or a
    // mandate otherwise active), cancel it first — deleting the player
    // record must not leave the family being charged for a club they've
    // left.
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id")
      .eq("player_id", request.player_id);
    const registrationIds = (registrations ?? []).map((r) => r.id);

    if (registrationIds.length > 0) {
      const { data: payments } = await supabase
        .from("payments")
        .select("status, gocardless_mandate_id")
        .in("registration_id", registrationIds);

      for (const pay of payments ?? []) {
        if (pay.status === "processing" && pay.gocardless_mandate_id) {
          try {
            await cancelMandate(pay.gocardless_mandate_id);
          } catch {
            // GoCardless unreachable — don't block the removal; the
            // committee can cancel the mandate manually from the
            // GoCardless dashboard as a fallback.
          }
        }
      }
    }

    await supabase.from("players").delete().eq("id", request.player_id);
  } else {
    await supabase
      .from("player_removal_requests")
      .update({ status: "rejected", resolved_at: new Date().toISOString() })
      .eq("id", requestId);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
