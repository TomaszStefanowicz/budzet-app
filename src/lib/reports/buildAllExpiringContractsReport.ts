import { shiftMonth } from "./shiftMonth.ts";
import { aggregateMonthlyRevenuePerClient } from "./aggregateMonthlyRevenuePerClient.ts";
import type { ItemMonthFact, ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport.ts";

/**
 * Zestawienie 17 (SPEC.md III.B.17, decyzja V.52): WSZYSCY klienci, których
 * konkretna umowa (pakiet rozliczany międzyokresowo) wygasa w miesiącu
 * `targetMonth` - w przeciwieństwie do zestawienia 13, bez sprawdzania, czy
 * klient później przedłużył. Pozwala policzyć poza aplikacją proporcję
 * przedłużających względem wszystkich wygasających, nie tylko względem
 * tych, którzy w ogóle nie przedłużyli.
 *
 * Kwalifikacja jest hybrydowa - żeby złapać też BEZSZWOWE przedłużenia (nowy
 * dokument zaczyna przychód dokładnie w M+1, więc zagregowany przychód
 * klienta nigdy nie spada do zera), trzeba patrzeć na POJEDYNCZY dokument
 * (`nip|documentNumber`), nie na sumę klienta - inaczej taki przypadek
 * byłby nie do odróżnienia od jednej, nigdy niewygasającej umowy ciągnącej
 * się przez M+1. Ale korekty (FKS) mają WŁASNY numer dokumentu, inny niż
 * faktura, którą korygują (baza nie przechowuje tego powiązania) - jedyny
 * sposób, żeby korekta poprawnie wyzerowała przychód, to zsumować ją z
 * oryginałem po NIP i miesiącu (decyzja V.8: agregaty per klient, odporność
 * na korekty). Stąd dwa warunki naraz:
 *   1. AGREGAT (NIP, cała seria bez flagi I - z H i korektami): przychód
 *      klienta w M-1 i M > 0 - gwarantuje, że korekta zerująca przychód w
 *      tym miesiącu poprawnie wyklucza klienta;
 *   2. DOKUMENT (tylko flaga F lub G): jego własny przychód w M > 0, w
 *      M+1 = 0 - identyfikuje, KTÓRA konkretna umowa (nowy dostęp albo
 *      przedłużenie) się kończy, niezależnie od tego, czy klient ma już
 *      inny, nowy dokument z przychodem od M+1.
 * Dokument musi mieć flagę F albo G, nie tylko != I - inaczej samodzielne
 * jednomiesięczne dokupienie (flaga H, dozwolone bez ograniczenia liczby
 * miesięcy, decyzja V.27) też przechodziłoby test "przychód w M, zero w
 * M+1" i błędnie trafiało na listę jako "wygasająca umowa", mimo że to nie
 * jest dostęp podlegający wygaśnięciu/przedłużeniu. Świadomie NIE wymagamy
 * własnego przychodu dokumentu w M-1 - klient rozliczany cyklicznie co
 * miesiąc osobnym dokumentem z flagą G (potwierdzony wyjątek z decyzji
 * V.44) nigdy nie miałby własnego przychodu w miesiącu poprzednim w TYM
 * SAMYM dokumencie, a mimo to zestawienie 13 (licząc na agregacie klienta)
 * słusznie go pokazuje - 17 ma być nadzbiorem 13, więc musi zachować się
 * tak samo. Potwierdzone z użytkownikiem na danych rzeczywistych.
 *
 * Wartość i faktury pochodzą z M-1, tylko z wygasających dokumentów danego
 * klienta (nie z całego jego przychodu z M-1, który mógłby już zawierać
 * przychód z nowej, przedłużającej umowy) - potwierdzone z użytkownikiem.
 *
 * Reguła horyzontu jak w 13 (wymaga M-1 i M+1 w wykrytym zakresie danych) -
 * odpowiedzialność wywołującego (`isWithinExpiringHorizon`).
 */
export function buildAllExpiringContractsReport(
  facts: ItemMonthFact[],
  targetMonth: string
): ClientRevenueReportRow[] {
  const seriesFacts = facts.filter((f) => f.flag !== "I");
  const previousMonth = shiftMonth(targetMonth, -1);
  const nextMonth = shiftMonth(targetMonth, 1);

  const monthlyTotals = aggregateMonthlyRevenuePerClient(
    seriesFacts.map((f) => ({ nip: f.nip, month: f.month, amountGrosze: f.monthlyAmountGrosze }))
  );
  const totalGroszeByKey = new Map(monthlyTotals.map((r) => [`${r.nip}|${r.month}`, r.totalGrosze]));

  const amountsByAccessDocument = new Map<string, Map<string, number>>();
  for (const fact of seriesFacts) {
    if (fact.flag !== "F" && fact.flag !== "G") continue;
    const key = `${fact.nip}|${fact.documentNumber}`;
    const monthMap = amountsByAccessDocument.get(key) ?? new Map<string, number>();
    monthMap.set(fact.month, (monthMap.get(fact.month) ?? 0) + fact.monthlyAmountGrosze);
    amountsByAccessDocument.set(key, monthMap);
  }

  const expiringDocumentKeysByNip = new Map<string, string[]>();
  for (const [key, monthMap] of amountsByAccessDocument) {
    const ownCurrent = monthMap.get(targetMonth) ?? 0;
    const ownNext = monthMap.get(nextMonth) ?? 0;
    if (!(ownCurrent > 0) || ownNext > 0) continue;

    const nip = key.split("|")[0];
    const aggregatePrevious = totalGroszeByKey.get(`${nip}|${previousMonth}`) ?? 0;
    const aggregateCurrent = totalGroszeByKey.get(`${nip}|${targetMonth}`) ?? 0;
    if (!(aggregatePrevious > 0 && aggregateCurrent > 0)) continue;

    const keys = expiringDocumentKeysByNip.get(nip) ?? [];
    keys.push(key);
    expiringDocumentKeysByNip.set(nip, keys);
  }

  const result: ClientRevenueReportRow[] = [];
  for (const [nip, documentKeys] of expiringDocumentKeysByNip) {
    const documentKeySet = new Set(documentKeys);
    let revenueGrosze = 0;
    let invoiceTotalGrosze = 0;
    const documentNumbers: string[] = [];
    for (const fact of seriesFacts) {
      if (fact.month !== previousMonth) continue;
      if (!documentKeySet.has(`${fact.nip}|${fact.documentNumber}`)) continue;
      revenueGrosze += fact.monthlyAmountGrosze;
      invoiceTotalGrosze += fact.invoiceNetAmountGrosze;
      documentNumbers.push(fact.documentNumber);
    }
    result.push({ nip, revenueGrosze, invoiceTotalGrosze, documentNumbers });
  }

  return result;
}
