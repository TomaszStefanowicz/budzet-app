/**
 * Reguła horyzontu dla zestawień 14-15 (SPEC.md 14.c/15.c, decyzja V.44) -
 * inna niż dla zestawienia 13 (`expiringReportHorizon.ts`). Kwalifikacja
 * klienta jako "nowego"/"przedłużającego od M" opiera się na fladze F/G,
 * zwalidowanej przy imporcie względem całej widocznej historii - nie trzeba
 * więc, żeby M-1 istniał w danych (nawet pierwszy miesiąc całego zakresu
 * może być poprawnie zgłoszony). Potrzeba tylko, żeby M+1 istniał - wartość
 * (SPEC.md, decyzja V.44) pochodzi z pierwszego pełnego miesiąca po starcie.
 */
export function isWithinPackageStartHorizon(months: string[], month: string): boolean {
  const index = months.indexOf(month);
  return index >= 0 && index < months.length - 1;
}
