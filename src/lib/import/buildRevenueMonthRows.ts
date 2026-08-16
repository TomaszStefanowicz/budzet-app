import type { ParsedSalesRow } from "./parseSalesRows";
import { monthIndexToDate } from "./parseSalesRows";
import { formatMonthDate } from "./formatMonthDate";
import { formatGroszeAsDecimal } from "./formatGroszeAsDecimal";

export interface RevenueMonthRow {
  revenue_item_id: number;
  month: string;
  amount: string;
}

/**
 * Buduje wersy gotowe do insertu do revenue_months (SPEC.md IV.5, zadanie
 * 1.6d) - dosłowny odczyt kolumn miesięcznych z pliku, bez żadnych obliczeń
 * (SPEC.md V.33, ustalone przy okazji zadania 1.6a). Miesiące z kwotą zero
 * są pomijane (puste komórki = 0, SPEC.md II.4 - nie ma po co ich zapisywać).
 */
export function buildRevenueMonthRows(row: ParsedSalesRow, revenueItemId: number): RevenueMonthRow[] {
  return row.monthlyAmountsGrosze
    .map((amountGrosze, index) => ({ amountGrosze, index }))
    .filter(({ amountGrosze }) => amountGrosze !== 0)
    .map(({ amountGrosze, index }) => ({
      revenue_item_id: revenueItemId,
      month: formatMonthDate(monthIndexToDate(index)),
      amount: formatGroszeAsDecimal(amountGrosze),
    }));
}
