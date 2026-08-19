/**
 * Formatuje kwotę w groszach do wyświetlenia na ekranie w układzie polskim
 * (spacja co trzy cyfry, przecinek dziesiętny) - wyłącznie do UI, osobno od
 * `formatGroszeAsDecimal` (ten zostaje w formacie kropkowym, bo zasila zapis
 * do bazy NUMERIC(14,2) i eksport .xlsx - zmiana tamtej funkcji zepsułaby
 * obie). Czysta arytmetyka całkowita (CLAUDE.md pkt 7) - grosze są już
 * liczbą całkowitą, dzielenie/modulo bez zaokrągleń.
 */
export function formatZl(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  const zloty = Math.trunc(abs / 100);
  const grosz = abs % 100;
  const zlotyWithSpaces = String(zloty).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${zlotyWithSpaces},${String(grosz).padStart(2, "0")} zł`;
}
