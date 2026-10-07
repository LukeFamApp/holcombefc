"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import {
  FINE_AMOUNTS_PENCE,
  FINE_UNPAID_STATUSES,
  type FineCardType,
} from "@/lib/config";
import {
  createBillingRequestFlowForFine,
  friendlyGoCardlessError,
} from "@/lib/payments";

function isCardType(value: string): value is FineCardType {
  return value === "yellow" || value === "red";
}

// ---------------------------------------------------------------------------
// Admin: issue / withdraw a card
// ---------------------------------------------------------------------------

export async function issueFine(formData: FormData) {
  const supabase = await requireAdmin();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const playerId = String(formData.get("playerId") ?? "");
  const cardType = String(formData.get("cardType") ?? "");

  if (!playerId || !isCardType(cardType)) {
    redirect(
      `/admin/fines?error=${encodeURIComponent(
        "Please choose a player and a card colour.",
      )}`,
    );
  }

  // Absorb a double-click: same card to the same player seconds apart is
  // one card, not two.
  const { data: recent } = await supabase
    .from("fines")
    .select("id")
    .eq("player_id", playerId)
    .eq("card_type", cardType)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString())
    .limit(1);
  if (recent && recent.length > 0) {
    redirect("/admin/fines?issued=1");
  }

  const { error } = await supabase.from("fines").insert({
    player_id: playerId,
    card_type: cardType,
    amount_pence: FINE_AMOUNTS_PENCE[cardType],
    issued_by: user?.id ?? null,
  });

  if (error) {
    redirect(
      `/admin/fines?error=${encodeURIComponent(
        "Could not issue the card — please try again.",
      )}`,
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/fines");
  redirect("/admin/fines?issued=1");
}

// Only a fine with no live or completed payment behind it can be withdrawn —
// once a Direct Debit is in flight or collected, removing it here would
// leave the money out of step with the record.
export async function withdrawFine(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase
    .from("fines")
    .update({ status: "withdrawn" })
    .eq("id", id)
    .in("status", FINE_UNPAID_STATUSES);

  revalidatePath("/admin");
  revalidatePath("/admin/fines");
}

// ---------------------------------------------------------------------------
// Parent: pay an outstanding fine
// ---------------------------------------------------------------------------

export async function payFine(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/fines");
  }

  const fineId = String(formData.get("fineId") ?? "");
  if (!fineId) {
    redirect("/fines");
  }

  // RLS scopes this to fines against the parent's own players, so a hit
  // doubles as the ownership check.
  const { data: fine } = await supabase
    .from("fines")
    .select("id, status")
    .eq("id", fineId)
    .single();

  if (!fine) {
    redirect(
      `/fines?error=${encodeURIComponent("That fine couldn't be found.")}`,
    );
  }
  // Only an unpaid fine can (re)start payment — never one that's already
  // in flight, paid, or withdrawn.
  if (!FINE_UNPAID_STATUSES.includes(fine.status)) {
    redirect("/fines");
  }

  const { data: parentRow } = await supabase
    .from("parents")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  let authorisationUrl: string;
  try {
    authorisationUrl = await createBillingRequestFlowForFine({
      fineId: fine.id,
      parent: parentRow,
    });
  } catch (err) {
    redirect(`/fines?error=${encodeURIComponent(friendlyGoCardlessError(err))}`);
  }

  redirect(authorisationUrl);
}
