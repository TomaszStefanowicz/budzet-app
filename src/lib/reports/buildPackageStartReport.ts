import { shiftMonth } from "./shiftMonth.ts";
import type { ItemMonthFact, ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport.ts";

/**
 * Zestawienia 14 i 15 (SPEC.md III.B.14-15, doprecyzowane decyzją V.44):
 * klienci, których pakiet z flagą `originatingFlag` ("F" dla 14 - nowi
 * klienci, "G" dla 15 - przedłużający) zaczyna się w miesiącu `targetMonth`.
 *
 * W przeciwieństwie do pierwotnej procedury referencyjnej (agregat "brak
 * przychodu w M-1, jest w M i M+1"), kwalifikacja NIE jest tu wyliczana z
 * lokalnego okna trzech miesięcy - flaga F/G jest już zwalidowana przy
 * imporcie względem CAŁEJ widocznej historii klienta (`validateFlagContinuity`,
 * SPEC.md II.3.g), więc powtórne wyliczanie "nowości" z agregatu M-1
 * powtórzyłoby błąd znaleziony w zestawieniu 13 (V.43) - długość ewentualnej
 * przerwy przed danym pakietem nie ma znaczenia, o klasyfikacji decyduje
 * flaga. Zamiast tego: dla każdego wersu o zadanej fladze szukamy
 * najwcześniejszego miesiąca z niezerową kwotą w jego własnym rozbiciu
 * miesięcznym (`revenue_months`) - to jest miesiąc startu TEGO pakietu.
 * Wykluczenie flagi I jest tu nieistotne wprost (I nigdy nie ma flagi F/G),
 * ale seria (do wartości/faktur) i tak jej nie obejmuje, konsekwentnie z 11a.
 *
 * Wartość i faktury (potwierdzone z użytkownikiem) pochodzą z **M+1**, nie z
 * M - M może być tylko częściowy, jeśli pakiet zaczyna się w jego trakcie
 * (symetrycznie do 13.b.v, które z tego samego powodu używa M-1).
 *
 * Reguła horyzontu (`packageStartHorizon.ts`) jest inna niż w zestawieniu 13
 * - nie wymaga, żeby M-1 istniał (flaga już mówi o nowości), tylko żeby M+1
 * istniał (do policzenia wartości).
 */
export function buildPackageStartReport(
  facts: ItemMonthFact[],
  originatingFlag: "F" | "G",
  targetMonth: string
): ClientRevenueReportRow[] {
  const seriesFacts = facts.filter((f) => f.flag !== "I");
  const nextMonth = shiftMonth(targetMonth, 1);

  const firstMonthByDocument = new Map<string, string>();
  for (const fact of seriesFacts) {
    if (fact.flag !== originatingFlag || fact.monthlyAmountGrosze <= 0) continue;
    const key = `${fact.nip}|${fact.documentNumber}`;
    const existing = firstMonthByDocument.get(key);
    if (existing === undefined || fact.month < existing) {
      firstMonthByDocument.set(key, fact.month);
    }
  }

  const startingNips = new Set<string>();
  for (const [key, month] of firstMonthByDocument) {
    if (month === targetMonth) {
      startingNips.add(key.split("|")[0]);
    }
  }

  const revenueByNip = new Map<string, number>();
  const invoiceTotals = new Map<string, { invoiceTotalGrosze: number; documentNumbers: string[] }>();
  for (const fact of seriesFacts) {
    if (fact.month !== nextMonth || !startingNips.has(fact.nip)) continue;
    revenueByNip.set(fact.nip, (revenueByNip.get(fact.nip) ?? 0) + fact.monthlyAmountGrosze);
    const entry = invoiceTotals.get(fact.nip) ?? { invoiceTotalGrosze: 0, documentNumbers: [] };
    entry.invoiceTotalGrosze += fact.invoiceNetAmountGrosze;
    entry.documentNumbers.push(fact.documentNumber);
    invoiceTotals.set(fact.nip, entry);
  }

  return Array.from(startingNips).map((nip) => ({
    nip,
    revenueGrosze: revenueByNip.get(nip) ?? 0,
    invoiceTotalGrosze: invoiceTotals.get(nip)?.invoiceTotalGrosze ?? 0,
    documentNumbers: invoiceTotals.get(nip)?.documentNumbers ?? [],
  }));
}
