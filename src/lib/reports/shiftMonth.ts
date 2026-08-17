/**
 * Przesuwa miesiąc (format "rrrr-mm-01") o `delta` miesięcy - potrzebne do
 * reguły horyzontu M-1/M/M+1 w zestawieniach 13-15 (SPEC.md III.B.13-15).
 */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.slice(0, 7).split("-").map(Number);
  const total = year * 12 + (monthNum - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonthNum = (total % 12) + 1;
  return `${newYear}-${String(newMonthNum).padStart(2, "0")}-01`;
}
