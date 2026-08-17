import { formatGroszeAsDecimal } from "@/lib/import/formatGroszeAsDecimal";
import type { MonthlySummary } from "@/lib/reports/buildMonthlySummary";
import type { ClientRevenueReportRow } from "@/lib/reports/buildClientMonthlyRevenueReport";

type SheetCell = string | number;

/**
 * Kwota w groszach jako liczba złotych do komórki .xlsx (SPEC.md V.39 -
 * eksport to surowa tabela, więc format kopiowalny do arkusza, nie tekst).
 * Zaokrąglenie wyłącznie na tym, wyjściowym etapie (CLAUDE.md pkt 7) -
 * `formatGroszeAsDecimal` liczy na groszach całkowitych, `Number()` tylko
 * parsuje wynikowy tekst do liczby dla komórki arkusza.
 */
function zl(grosze: number): number {
  return Number(formatGroszeAsDecimal(grosze));
}

export function buildSummarySheetRows(summary: MonthlySummary, banksAndSkoks: number): SheetCell[][] {
  return [
    ["Zestawienie", "Wartość"],
    ["1. Liczba klientów, którzy zapłacili", summary.payingClientsCount],
    ["2. Wartość sprzedaży — razem", zl(summary.salesBreakdown.total)],
    ["3. Wartość sprzedaży — klienci nowi (F)", zl(summary.salesBreakdown.F)],
    ["4. Wartość sprzedaży — klienci przedłużający (G)", zl(summary.salesBreakdown.G)],
    ["5. Wartość sprzedaży — dokupienia (H)", zl(summary.salesBreakdown.H)],
    ["6. Wartość sprzedaży — zakupy incydentalne (I)", zl(summary.salesBreakdown.I)],
    ["— w tym korekty (sprzedaż)", zl(summary.salesBreakdown.corrections)],
    ["7. Wartość przychodów — razem", zl(summary.revenueBreakdown.total)],
    ["8. Wartość przychodów — klienci nowi (F)", zl(summary.revenueBreakdown.F)],
    ["9. Wartość przychodów — klienci przedłużający (G)", zl(summary.revenueBreakdown.G)],
    ["10. Wartość przychodów — dokupienia (H)", zl(summary.revenueBreakdown.H)],
    ["11. Wartość przychodów — zakupy incydentalne (I)", zl(summary.revenueBreakdown.I)],
    ["— w tym korekty (przychody)", zl(summary.revenueBreakdown.corrections)],
    ["16. Liczba banków / SKOK-ów wśród płacących", banksAndSkoks],
  ];
}

function buildClientTableSheetRows(
  clientReport: ClientRevenueReportRow[],
  clientNames: Map<string, string>,
  revenueLabel: string
): SheetCell[][] {
  const header: SheetCell[] = ["NIP", "Nazwa", revenueLabel, "Suma faktur", "Dokumenty"];
  const rows: SheetCell[][] = clientReport.map((row) => [
    row.nip,
    clientNames.get(row.nip) ?? "(nieznana nazwa)",
    zl(row.revenueGrosze),
    zl(row.invoiceTotalGrosze),
    row.documentNumbers.join(", "),
  ]);
  return [header, ...rows];
}

export function buildClientsSheetRows(
  clientReport: ClientRevenueReportRow[],
  clientNames: Map<string, string>
): SheetCell[][] {
  return buildClientTableSheetRows(clientReport, clientNames, "Przychód miesiąca");
}

export function buildExpiringSheetRows(
  expiringReport: ClientRevenueReportRow[],
  clientNames: Map<string, string>
): SheetCell[][] {
  return buildClientTableSheetRows(expiringReport, clientNames, "Wartość do utraty (miesiąc poprzedni)");
}
