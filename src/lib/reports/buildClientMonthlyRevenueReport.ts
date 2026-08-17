import { aggregateMonthlyRevenuePerClient } from "./aggregateMonthlyRevenuePerClient.ts";

export interface ItemMonthFact {
  nip: string;
  flag: "F" | "G" | "H" | "I" | null;
  month: string;
  monthlyAmountGrosze: number;
  documentNumber: string;
  invoiceNetAmountGrosze: number;
}

export interface ClientRevenueReportRow {
  nip: string;
  revenueGrosze: number;
  invoiceTotalGrosze: number;
  documentNumbers: string[];
}

/**
 * Buduje zestawienie 12 (SPEC.md III.B.12) dla podanego miesiąca - liczbę i
 * listę klientów generujących przychody, z sumą wartości odpowiadających
 * faktur i ich numerami. Obejmuje wszystkie wersy, łącznie z korektami FKS
 * (SPEC.md 11a - w przeciwieństwie do zestawień 13-15).
 *
 * Ważne rozróżnienie (SPEC.md 12.b.v): `revenueGrosze` to suma tylko tej
 * części kwoty, która przypada na dany miesiąc; `invoiceTotalGrosze` to
 * PEŁNA wartość każdej faktury mającej jakikolwiek przychód w tym miesiącu
 * (nie tylko przypadająca na ten miesiąc część) - dwie różne liczby, obie
 * potrzebne do weryfikacji, których faktur dotyczy przychód.
 */
export function buildClientMonthlyRevenueReport(
  facts: ItemMonthFact[],
  targetMonth: string
): ClientRevenueReportRow[] {
  const qualifying = aggregateMonthlyRevenuePerClient(
    facts.map((f) => ({ nip: f.nip, month: f.month, amountGrosze: f.monthlyAmountGrosze }))
  ).filter((row) => row.month === targetMonth);

  const qualifyingNips = new Set(qualifying.map((row) => row.nip));

  const invoiceTotals = new Map<string, { invoiceTotalGrosze: number; documentNumbers: string[] }>();
  for (const fact of facts) {
    if (fact.month !== targetMonth || !qualifyingNips.has(fact.nip)) continue;
    const entry = invoiceTotals.get(fact.nip) ?? { invoiceTotalGrosze: 0, documentNumbers: [] };
    entry.invoiceTotalGrosze += fact.invoiceNetAmountGrosze;
    entry.documentNumbers.push(fact.documentNumber);
    invoiceTotals.set(fact.nip, entry);
  }

  return qualifying.map((row) => ({
    nip: row.nip,
    revenueGrosze: row.totalGrosze,
    invoiceTotalGrosze: invoiceTotals.get(row.nip)?.invoiceTotalGrosze ?? 0,
    documentNumbers: invoiceTotals.get(row.nip)?.documentNumbers ?? [],
  }));
}
