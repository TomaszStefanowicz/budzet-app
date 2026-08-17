/**
 * Reguła horyzontu danych dla zestawień 13-15 (SPEC.md 13.d): liczone są
 * wyłącznie dla miesięcy M, dla których M-1 i M+1 istnieją w wykrytym
 * zakresie danych - czyli z wyłączeniem pierwszego i ostatniego miesiąca
 * całego zakresu. `months` to pełna, uporządkowana lista miesięcy z zakresu
 * (np. wynik `loadAvailableMonths`).
 */
export function isWithinExpiringHorizon(months: string[], month: string): boolean {
  const index = months.indexOf(month);
  return index > 0 && index < months.length - 1;
}
