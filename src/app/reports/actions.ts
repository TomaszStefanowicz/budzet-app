"use server";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { loadAvailableMonths, loadReportFacts } from "./data";
import { buildMonthlySummary } from "@/lib/reports/buildMonthlySummary";
import type { FlagBreakdown } from "@/lib/reports/sumByFlag";
import { buildClientMonthlyRevenueReport } from "@/lib/reports/buildClientMonthlyRevenueReport";
import type { ClientRevenueReportRow } from "@/lib/reports/buildClientMonthlyRevenueReport";
import { buildExpiringContractsReport } from "@/lib/reports/buildExpiringContractsReport";
import { isWithinExpiringHorizon } from "@/lib/reports/expiringReportHorizon";
import { countBanksAndSkoks } from "@/lib/reports/countBanksAndSkoks";
import { formatGroszeAsDecimal } from "@/lib/import/formatGroszeAsDecimal";

function zl(grosze: number): number {
  return Number(formatGroszeAsDecimal(grosze));
}

function toClientPayload(rows: ClientRevenueReportRow[], clientNames: Map<string, string>) {
  return rows.map((row) => ({
    nip: row.nip,
    name: clientNames.get(row.nip) ?? null,
    revenueZl: zl(row.revenueGrosze),
    invoiceTotalZl: zl(row.invoiceTotalGrosze),
    documentNumbers: row.documentNumbers,
  }));
}

function breakdownToZl(breakdown: FlagBreakdown) {
  return {
    total: zl(breakdown.total),
    F: zl(breakdown.F),
    G: zl(breakdown.G),
    H: zl(breakdown.H),
    I: zl(breakdown.I),
    corrections: zl(breakdown.corrections),
  };
}

/**
 * Zapisuje migawkę zestawień dla wybranego miesiąca do `report_archive`
 * (SPEC.md IV.3, zadanie 4.1) - "co zostało wysłane do funduszu i kiedy",
 * na podstawie ostatniego udanego importu. Zestawienia same są liczone na
 * żądanie (P1) - archiwum nie służy do ponownego liczenia, tylko do
 * przywołania stanu z danego momentu. Przeglądanie archiwum poza zakresem
 * tej wersji - odczyt przez panel podglądu danych Supabase.
 */
export async function archiveReport(month: string): Promise<{ archivedAt: string }> {
  const supabase = createServiceRoleSupabaseClient();

  const { data: latestImport, error: importError } = await supabase
    .from("imports")
    .select("id")
    .eq("validation_status", "sukces")
    .order("imported_at", { ascending: false })
    .limit(1)
    .single();

  if (importError || !latestImport) {
    throw new Error("Brak udanego importu — nie ma czego archiwizować.");
  }

  const [{ salesFacts, itemMonthFacts, clientNames, clientTypes }, availableMonths] = await Promise.all([
    loadReportFacts(),
    loadAvailableMonths(),
  ]);
  const summary = buildMonthlySummary(salesFacts, itemMonthFacts, month);
  const clientReport = buildClientMonthlyRevenueReport(itemMonthFacts, month).sort(
    (a, b) => b.revenueGrosze - a.revenueGrosze
  );
  const banksAndSkoks = countBanksAndSkoks(clientReport.map((row) => row.nip), clientTypes);

  const payload: Record<string, unknown> = {
    summary: {
      payingClientsCount: summary.payingClientsCount,
      salesBreakdownZl: breakdownToZl(summary.salesBreakdown),
      revenueBreakdownZl: breakdownToZl(summary.revenueBreakdown),
      banksAndSkoks,
    },
    clients: toClientPayload(clientReport, clientNames),
  };

  if (isWithinExpiringHorizon(availableMonths, month)) {
    const expiringReport = buildExpiringContractsReport(itemMonthFacts, month).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    payload.expiringClients = toClientPayload(expiringReport, clientNames);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("report_archive")
    .insert({ import_id: latestImport.id, month, payload })
    .select("generated_at")
    .single();

  if (insertError || !inserted) {
    throw new Error(`Błąd zapisu do archiwum: ${insertError?.message ?? "brak danych"}`);
  }

  return { archivedAt: inserted.generated_at };
}
