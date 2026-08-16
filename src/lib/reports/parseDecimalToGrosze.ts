/**
 * Odwrotność formatGroszeAsDecimal (zadanie 1.6d): zamienia kwotę numeric(14,2)
 * odczytaną z bazy z powrotem na grosze (liczba całkowita). Wejście przechodzi
 * przez toFixed(2), żeby skorygować szum reprezentacji zmiennoprzecinkowej JS
 * (np. surowe `value * 100` dla 0.1 nie daje dokładnie 10) - to jedyny moment,
 * w którym dotykamy float, i tylko po to, żeby natychmiast wrócić do
 * arytmetyki całkowitej (CLAUDE.md pkt 7).
 */
export function parseDecimalToGrosze(value: number | string): number {
  const asFixed = Number(value).toFixed(2);
  const negative = asFixed.startsWith("-");
  const [zlotyRaw, groszeRaw] = asFixed.replace("-", "").split(".");
  const total = Number(zlotyRaw) * 100 + Number(groszeRaw);
  return negative ? -total : total;
}
