"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

const ALLOWED_TYPES = ["bank", "SKOK", "inny", "nieokreślony"] as const;
type ClientType = (typeof ALLOWED_TYPES)[number];

export async function updateClientType(nip: string, type: string) {
  if (!ALLOWED_TYPES.includes(type as ClientType)) {
    throw new Error(`Nieznany typ klienta: ${type}`);
  }

  const supabase = createServiceRoleSupabaseClient();
  const { error } = await supabase.from("clients").update({ type }).eq("nip", nip);
  if (error) {
    throw new Error(`Błąd zapisu typu klienta: ${error.message}`);
  }

  revalidatePath("/clients");
}
