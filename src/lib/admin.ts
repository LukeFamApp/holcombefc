import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: parent } = await supabase
    .from("parents")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!parent?.is_admin) {
    redirect("/");
  }

  return supabase;
}
