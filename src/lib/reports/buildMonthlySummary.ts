import { sumByFlag, type FlagBreakdown } from "./sumByFlag";
import { aggregateMonthlyRevenuePerClient } from "./aggregateMonthlyRevenuePerClient";

export interface SalesFact {
  month: string;
  flag: "F" | "G" | "H" | "I" | null;
  amountGrosze: number;
}

export interface ItemMonthFactForSummary {
  nip: string;
  month: string;
  flag: "F" | "G" | "H" | "I" | null;
  monthlyAmountGrosze: number;
}

export interface MonthlySummary {
  payingClientsCount: number;
  salesBreakdown: FlagBreakdown;
  revenueBreakdown: FlagBreakdown;
}

/**
 * Zestawienia 1-11 (SPEC.md III.A) dla jednego miesiąca: liczba płacących
 * klientów (1, ta sama definicja co 11a/12), rozbicie wartości sprzedaży wg
 * flagi (2-6, miesiąc SPRZEDAŻY) i rozbicie wartości przychodów wg flagi
 * (7-11, miesiąc KALENDARZOWY).
 */
export function buildMonthlySummary(
  salesFacts: SalesFact[],
  itemMonthFacts: ItemMonthFactForSummary[],
  targetMonth: string
): MonthlySummary {
  const paying = aggregateMonthlyRevenuePerClient(
    itemMonthFacts.map((f) => ({ nip: f.nip, month: f.month, amountGrosze: f.monthlyAmountGrosze }))
  ).filter((row) => row.month === targetMonth);

  const salesBreakdown = sumByFlag(salesFacts.filter((f) => f.month === targetMonth));
  const revenueBreakdown = sumByFlag(
    itemMonthFacts
      .filter((f) => f.month === targetMonth)
      .map((f) => ({ flag: f.flag, amountGrosze: f.monthlyAmountGrosze }))
  );

  return { payingClientsCount: paying.length, salesBreakdown, revenueBreakdown };
}
