/**
 * Formatuje miesiąc jako datę Postgresa "YYYY-MM-01" (zawsze pierwszy dzień -
 * kolumna oznacza wyłącznie "który miesiąc", nie konkretny dzień).
 */
export function formatMonthDate({ year, month }: { year: number; month: number }): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
