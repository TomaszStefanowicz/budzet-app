import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { parseDecimalToGrosze } from "@/lib/reports/parseDecimalToGrosze";
import type { SourceItemFact } from "@/lib/data-preview/buildSourceDataRows";

export interface SourceDataFacts {
  items: SourceItemFact[];
  clientNames: Map<string, string>;
}

/**
 * Odczytuje aktywne pozycje rozliczeniowe do podglądu "Dane" (odtworzenie
 * arkusza importu) - warstwa dostępu do bazy, poza `lib/` (CLAUDE.md pkt 6).
 */
export async function loadSourceDataFacts(): Promise<SourceDataFacts> {
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await supabase
    .from("revenue_items")
    .select("nip, document_number, net_amount, flag, source_row_number, revenue_months(month, amount)")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Błąd odczytu z bazy: ${error.message}`);
  }

  const items: SourceItemFact[] = [];
  const nips = new Set<string>();

  for (const item of data ?? []) {
    nips.add(item.nip);
    const monthlyAmountsGrosze = new Map<string, number>();
    for (const rm of item.revenue_months ?? []) {
      monthlyAmountsGrosze.set(rm.month, parseDecimalToGrosze(rm.amount));
    }

    items.push({
      sourceRowNumber: item.source_row_number,
      nip: item.nip,
      documentNumber: item.document_number,
      netAmountGrosze: parseDecimalToGrosze(item.net_amount),
      flag: item.flag,
      monthlyAmountsGrosze,
    });
  }

  const clientNames = new Map<string, string>();
  if (nips.size > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("nip, name")
      .in("nip", Array.from(nips));
    if (clientsError) {
      throw new Error(`Błąd odczytu słownika klientów: ${clientsError.message}`);
    }
    for (const client of clients ?? []) {
      clientNames.set(client.nip, client.name);
    }
  }

  return { items, clientNames };
}
