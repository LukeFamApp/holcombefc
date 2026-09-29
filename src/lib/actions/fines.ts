"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FINE_AMOUNTS_PENCE, type FineCardType } from "@/lib/config";
import {
  createBillingRequestFlowForFine,
  friendlyGoCardlessError,
} from "@/lib/payments";

function isCardType(value: string): value is FineCardType {
  return value === "yellow" || value === "red";
}

export async function payFine(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/fines");
  }

  const playerId = String(formData.get("playerId") ?? "");
  const cardType = String(formData.get("cardType") ?? "");

  if (!playerId || !isCardType(cardType)) {
    redirect(
      `/fines?error=${encodeURIComponent(
        "Please select a player and a card colour.",
      )}`,
    );
  }

  // RLS scopes this to the parent's own players, so a hit doubles as the
  // ownership check.
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .single();

  if (!player) {
    redirect(
      `/fines?error=${encodeURIComponent("That player couldn't be found.")}`,
    );
  }

  const amountPence = FINE_AMOUNTS_PENCE[cardType];

  const { data: fine, error: fineError } = await supabase
    .from("fines")
    .insert({
      player_id: playerId,
      card_type: cardType,
      amount_pence: amountPence,
    })
    .select("id")
    .single();

  if (fineError || !fine) {
    redirect(
      `/fines?error=${encodeURIComponent(
        "Could not start the fine payment — please try again.",
      )}`,
    );
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
