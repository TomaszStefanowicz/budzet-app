import { describe, expect, it } from "vitest";
import { buildMonthlySummary } from "./buildMonthlySummary";

describe("buildMonthlySummary", () => {
  it("liczy zestawienia 1-11 dla wybranego miesiąca, ignorując inne miesiące", () => {
    const salesFacts = [
      { month: "2026-03-01", flag: "F" as const, amountGrosze: 100000 },
      { month: "2026-03-01", flag: "G" as const, amountGrosze: 50000 },
      { month: "2026-03-01", flag: null, amountGrosze: -10000 }, // korekta
      { month: "2026-04-01", flag: "F" as const, amountGrosze: 999999 }, // inny miesiąc, poza zakresem
    ];
    const itemMonthFacts = [
      { nip: "1000000029", month: "2026-03-01", flag: "F" as const, monthlyAmountGrosze: 40000 },
      { nip: "1000000035", month: "2026-03-01", flag: "G" as const, monthlyAmountGrosze: 20000 },
      { nip: "1000000029", month: "2026-04-01", flag: "F" as const, monthlyAmountGrosze: 999999 }, // inny miesiąc
    ];

    const result = buildMonthlySummary(salesFacts, itemMonthFacts, "2026-03-01");

    expect(result.payingClientsCount).toBe(2);
    expect(result.salesBreakdown).toEqual({ total: 140000, F: 100000, G: 50000, H: 0, I: 0, corrections: -10000 });
    expect(result.revenueBreakdown).toEqual({ total: 60000, F: 40000, G: 20000, H: 0, I: 0, corrections: 0 });
  });

  it("wyklucza klienta z zerowym zsumowanym przychodem miesiąca z liczby płacących (1)", () => {
    const itemMonthFacts = [
      { nip: "1000000029", month: "2026-03-01", flag: "H" as const, monthlyAmountGrosze: 50000 },
      { nip: "1000000029", month: "2026-03-01", flag: null, monthlyAmountGrosze: -50000 }, // korekta zerująca
    ];

    const result = buildMonthlySummary([], itemMonthFacts, "2026-03-01");

    expect(result.payingClientsCount).toBe(0);
  });

  it("zwraca zera dla miesiąca bez żadnych faktów", () => {
    const result = buildMonthlySummary([], [], "2026-03-01");
    expect(result).toEqual({
      payingClientsCount: 0,
      salesBreakdown: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
      revenueBreakdown: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
    });
  });
});
