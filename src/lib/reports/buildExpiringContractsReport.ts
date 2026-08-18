import { shiftMonth } from "./shiftMonth.ts";
import { aggregateMonthlyRevenuePerClient } from "./aggregateMonthlyRevenuePerClient.ts";
import type { ItemMonthFact, ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport.ts";

/**
 * Zestawienie 13 (SPEC.md III.B.13, SPRECYZOWANE decyzją V.43): klienci,
 * których umowy WYGASŁY w miesiącu `targetMonth` i którzy **dotychczas (do
 * dnia ostatniego importu) nie przedłużyli**. Seria wejściowa wyklucza flagę
 * I w całości - nie tylko z testu kwalifikującego, ale też z wykazywanej
 * wartości i faktur (potwierdzone z użytkownikiem: zakup incydentalny nie
 * wchodzi do "wartości do utraty").
 *
 * Klient kwalifikuje się, gdy ma przychód (z serii) w M-1 i M, a **nigdy
 * później** (w żadnym miesiącu po M, aż do końca dostępnych danych) - nie
 * tylko w M+1. Rozliczenie międzyokresowe opiera się na dacie faktycznego
 * dostępu wskazanej na fakturze, nie na dacie jej wystawienia - klienci
 * czasem przedłużają z opóźnieniem (po utracie dostępu) albo ze świadomą,
 * zaplanowaną przerwą. Sprawdzanie tylko M+1 błędnie wykazywałoby takich
 * klientów jako wciąż niedziałających, mimo że w danych już widać ich
 * przedłużenie (potwierdzone z użytkownikiem na przykładach z maja 2026 -
 * Salumanus i Wschodni Bank Spółdzielczy w Chełmie, oba z realną,
 * jednomiesięczną przerwą przed opóźnionym/zaplanowanym przedłużeniem).
 *
 * Wykazywana wartość i faktury wciąż pochodzą z M-1, nie z M (13.b.v: M może
 * być tylko częściowy, jeśli umowa kończy się w jego trakcie) - to się nie
 * zmieniło, zmienił się tylko test kwalifikujący.
 *
 * Wywołujący odpowiada za regułę horyzontu (13.d, niezmieniona) - tę funkcję
 * można wywołać dla dowolnego miesiąca, ale wynik dla miesiąca bez widocznego
 * M-1 w danych, albo dla ostatniego miesiąca zakresu (brak jakichkolwiek
 * miesięcy "po", więc "nie przedłużyli dotychczas" byłoby prawdziwe tylko
 * przez brak danych, nie przez faktyczny stan), byłby fałszywy.
 */
export function buildExpiringContractsReport(facts: ItemMonthFact[], targetMonth: string): ClientRevenueReportRow[] {
  const seriesFacts = facts.filter((f) => f.flag !== "I");
  const previousMonth = shiftMonth(targetMonth, -1);

  const monthlyTotals = aggregateMonthlyRevenuePerClient(
    seriesFacts.map((f) => ({ nip: f.nip, month: f.month, amountGrosze: f.monthlyAmountGrosze }))
  );
  const totalGroszeByKey = new Map(monthlyTotals.map((r) => [`${r.nip}|${r.month}`, r.totalGrosze]));

  // `monthlyTotals` obejmuje wyłącznie pary (NIP, miesiąc) z przychodem > 0
  // (aggregateMonthlyRevenuePerClient filtruje resztę) - więc "przedłużył w
  // którymś późniejszym miesiącu" to po prostu "istnieje taki wpis później".
  const monthsWithRevenueByNip = new Map<string, string[]>();
  for (const row of monthlyTotals) {
    const months = monthsWithRevenueByNip.get(row.nip) ?? [];
    months.push(row.month);
    monthsWithRevenueByNip.set(row.nip, months);
  }

  const allNips = new Set(seriesFacts.map((f) => f.nip));
  const expiringNips = Array.from(allNips).filter((nip) => {
    const previous = totalGroszeByKey.get(`${nip}|${previousMonth}`) ?? 0;
    const current = totalGroszeByKey.get(`${nip}|${targetMonth}`) ?? 0;
    if (!(previous > 0 && current > 0)) return false;

    const hasRenewedSince = (monthsWithRevenueByNip.get(nip) ?? []).some((month) => month > targetMonth);
    return !hasRenewedSince;
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
