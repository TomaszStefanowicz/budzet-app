import type { ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport";

/**
 * Zestawienie 16 (SPEC.md III.B.16, decyzja V.45): lista klientów z
 * zestawienia 12 (przychód miesiąca > 0), którzy w słowniku klientów mają
 * typ "bank" lub "SKOK". Typ jest atrybutem słownika, nigdy nie wykrywanym
 * z nazwy (zasada twarda projektu) - stąd wymaga mapy NIP -> typ
 * dostarczonej przez wywołującego (odczyt z tabeli clients), nie da się
 * tego wyliczyć z samych danych sprzedażowych.
 */
export function filterBanksAndSkoks(
  rows: ClientRevenueReportRow[],
  clientTypes: Map<string, string>
): ClientRevenueReportRow[] {
  return rows.filter((row) => {
    const type = clientTypes.get(row.nip);
    return type === "bank" || type === "SKOK";
  });
}
