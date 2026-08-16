/**
 * Formatuje kwotę w groszach jako tekst dla kolumny numeric(14,2) - wyłącznie
 * arytmetyka całkowita (dzielenie/modulo), zero pływających przecinków
 * (CLAUDE.md pkt 7). Zaokrąglenie następuje wyłącznie na wyjściu - grosze
 * są już liczbą całkowitą, więc tu nie ma czego zaokrąglać.
 */
export function formatGroszeAsDecimal(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  const zloty = Math.trunc(abs / 100);
  const reszta = abs % 100;
  return `${sign}${zloty}.${String(reszta).padStart(2, "0")}`;
}
