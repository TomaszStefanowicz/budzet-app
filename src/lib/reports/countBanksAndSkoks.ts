/**
 * Zestawienie 16 (SPEC.md III.B.16): liczba klientów z zestawienia 12
 * (przychód miesiąca > 0), którzy w słowniku klientów mają typ "bank" lub
 * "SKOK". Typ jest atrybutem słownika, nigdy nie wykrywanym z nazwy (zasada
 * twarda projektu) - stąd wymaga mapy NIP -> typ dostarczonej przez
 * wywołującego (odczyt z tabeli clients), nie da się tego wyliczyć z samych
 * danych sprzedażowych.
 */
export function countBanksAndSkoks(nips: string[], clientTypes: Map<string, string>): number {
  return nips.filter((nip) => {
    const type = clientTypes.get(nip);
    return type === "bank" || type === "SKOK";
  }).length;
}
