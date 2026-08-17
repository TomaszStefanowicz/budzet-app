import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { parseDecimalToGrosze } from "@/lib/reports/parseDecimalToGrosze";
import type { SalesFact } from "@/lib/reports/buildMonthlySummary";
import type { ItemMonthFact } from "@/lib/reports/buildClientMonthlyRevenueReport";

export interface ReportFacts {
  salesFacts: SalesFact[];
  itemMonthFacts: ItemMonthFact[];
  clientNames: Map<string, string>;
  clientTypes: Map<string, string>;
}

/**
 * Odczytuje wszystkie aktywne pozycje rozliczeniowe i słownik klientów z bazy
 * (warstwa dostępu do bazy - CLAUDE.md pkt 6, poza `lib/`). Odpowiednik
 * `factsFromDatabase` z `scripts/preview-report.ts`, tu jako właściwy kod
 * produkcyjny ekranu zestawień (zadanie 3.3).
 */
export async function loadReportFacts(): Promise<ReportFacts> {
  const supabase = createServiceRoleSupabaseClient();

  const { data, error } = await supabase
    .from("revenue_items")
    .select("nip, flag, sale_month, document_number, net_amount, revenue_months(month, amount)")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Błąd odczytu z bazy: ${error.message}`);
  }

  const salesFacts: SalesFact[] = [];
  const itemMonthFacts: ItemMonthFact[] = [];
  const nips = new Set<string>();

  for (const item of data ?? []) {
    nips.add(item.nip);
    const invoiceNetAmountGrosze = parseDecimalToGrosze(item.net_amount);

    salesFacts.push({ month: item.sale_month, flag: item.flag, amountGrosze: invoiceNetAmountGrosze });

    for (const rm of item.revenue_months ?? []) {
      itemMonthFacts.push({
        nip: item.nip,
        flag: item.flag,
        documentNumber: item.document_number,
        invoiceNetAmountGrosze,
        month: rm.month,
        monthlyAmountGrosze: parseDecimalToGrosze(rm.amount),
      });
    }
  }

  const clientNames = new Map<string, string>();
  const clientTypes = new Map<string, string>();
  if (nips.size > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("nip, name, type")
      .in("nip", Array.from(nips));
    if (clientsError) {
      throw new Error(`Błąd odczytu słownika klientów: ${clientsError.message}`);
    }
    for (const client of clients ?? []) {
      clientNames.set(client.nip, client.name);
      clientTypes.set(client.nip, client.type);
    }
  }

  return { salesFacts, itemMonthFacts, clientNames, clientTypes };
}

/**
 * Zakres miesięcy dostępny do wyboru na ekranie zestawień - wykryty zakres
 * kolumn miesięcznych z najnowszego udanego importu (SPEC.md II.4). To ten
 * sam zakres, co "Zakres miesięcy" w historii importów na ekranie głównym.
 */
export async function loadAvailableMonths(): Promise<string[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("imports")
    .select("detected_month_from, detected_month_to")
    .eq("validation_status", "sukces")
    .order("imported_at", { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Błąd odczytu zakresu miesięcy: ${error.message}`);
  }

  const latest = data?.[0];
  if (!latest?.detected_month_from || !latest?.detected_month_to) {
    return [];
  }
  return enumerateMonths(latest.detected_month_from, latest.detected_month_to);
}

function enumerateMonths(from: string, to: string): string[] {
  let [year, month] = from.slice(0, 7).split("-").map(Number);
  const [toYear, toMonth] = to.slice(0, 7).split("-").map(Number);

  const months: string[] = [];
  while (year < toYear || (year === toYear && month <= toMonth)) {
    months.push(`${year}-${String(month).padStart(2, "0")}-01`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}
