import { shiftMonth } from "./shiftMonth.ts";
import { aggregateMonthlyRevenuePerClient } from "./aggregateMonthlyRevenuePerClient.ts";
import type { ItemMonthFact, ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport.ts";

/**
 * Zestawienie 13 (SPEC.md III.B.13): klienci, których umowy wygasają w
 * miesiącu `targetMonth`. Seria wejściowa wyklucza flagę I w całości - nie
 * tylko z testu kwalifikującego, ale też z wykazywanej wartości i faktur
 * (potwierdzone z użytkownikiem: zakup incydentalny nie wchodzi do "wartości
 * do utraty"). Klient kwalifikuje się, gdy ma przychód (z serii) w M-1 i M,
 * a nie ma go w M+1 - wykazywana wartość i faktury pochodzą z M-1, nie z M
 * (13.b.v: M może być tylko częściowy, jeśli umowa kończy się w jego trakcie).
 *
 * Wywołujący odpowiada za regułę horyzontu (13.d) - tę funkcję można wywołać
 * dla dowolnego miesiąca, ale wynik dla miesiąca bez widocznego M-1 lub M+1
 * w danych byłby fałszywie zaniżony (potraktowany jak brak przychodu).
 */
export function buildExpiringContractsReport(facts: ItemMonthFact[], targetMonth: string): ClientRevenueReportRow[] {
  const seriesFacts = facts.filter((f) => f.flag !== "I");
  const previousMonth = shiftMonth(targetMonth, -1);
  const nextMonth = shiftMonth(targetMonth, 1);

  const monthlyTotals = aggregateMonthlyRevenuePerClient(
    seriesFacts.map((f) => ({ nip: f.nip, month: f.month, amountGrosze: f.monthlyAmountGrosze }))
  );
  const totalGroszeByKey = new Map(monthlyTotals.map((r) => [`${r.nip}|${r.month}`, r.totalGrosze]));

  const allNips = new Set(seriesFacts.map((f) => f.nip));
  const expiringNips = Array.from(allNips).filter((nip) => {
    const previous = totalGroszeByKey.get(`${nip}|${previousMonth}`) ?? 0;
    const current = totalGroszeByKey.get(`${nip}|${targetMonth}`) ?? 0;
    const next = totalGroszeByKey.get(`${nip}|${nextMonth}`) ?? 0;
    return previous > 0 && current > 0 && !(next > 0);
  });

  const qualifyingNips = new Set(expiringNips);
  const invoiceTotals = new Map<string, { invoiceTotalGrosze: number; documentNumbers: string[] }>();
  for (const fact of seriesFacts) {
    if (fact.month !== previousMonth || !qualifyingNips.has(fact.nip)) continue;
    const entry = invoiceTotals.get(fact.nip) ?? { invoiceTotalGrosze: 0, documentNumbers: [] };
    entry.invoiceTotalGrosze += fact.invoiceNetAmountGrosze;
    entry.documentNumbers.push(fact.documentNumber);
    invoiceTotals.set(fact.nip, entry);
  }

  return expiringNips.map((nip) => ({
    nip,
    revenueGrosze: totalGroszeByKey.get(`${nip}|${previousMonth}`) ?? 0,
    invoiceTotalGrosze: invoiceTotals.get(nip)?.invoiceTotalGrosze ?? 0,
    documentNumbers: invoiceTotals.get(nip)?.documentNumbers ?? [],
  }));
}
