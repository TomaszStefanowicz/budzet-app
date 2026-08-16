import { describe, expect, it } from "vitest";
import { aggregateMonthlyRevenuePerClient } from "./aggregateMonthlyRevenuePerClient";

describe("aggregateMonthlyRevenuePerClient", () => {
  it("sumuje kilka wersów tego samego klienta w tym samym miesiącu", () => {
    const result = aggregateMonthlyRevenuePerClient([
      { nip: "1111111111", month: "2026-03-01", amountGrosze: 100000 },
      { nip: "1111111111", month: "2026-03-01", amountGrosze: 50000 },
    ]);
    expect(result).toEqual([{ nip: "1111111111", month: "2026-03-01", totalGrosze: 150000 }]);
  });

  it("wyklucza pary z sumą <= 0 (SPEC.md 11a)", () => {
    const result = aggregateMonthlyRevenuePerClient([
      { nip: "1111111111", month: "2026-03-01", amountGrosze: 100000 },
      { nip: "1111111111", month: "2026-03-01", amountGrosze: -100000 }, // korekta zerująca miesiąc
      { nip: "2222222222", month: "2026-03-01", amountGrosze: -50000 }, // wynik ujemny
    ]);
    expect(result).toEqual([]);
  });

  it("nie miesza niezależnych klientów i miesięcy", () => {
    const result = aggregateMonthlyRevenuePerClient([
      { nip: "1111111111", month: "2026-01-01", amountGrosze: 100000 },
      { nip: "1111111111", month: "2026-02-01", amountGrosze: 200000 },
      { nip: "2222222222", month: "2026-01-01", amountGrosze: 300000 },
    ]);
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ nip: "1111111111", month: "2026-01-01", totalGrosze: 100000 });
    expect(result).toContainEqual({ nip: "1111111111", month: "2026-02-01", totalGrosze: 200000 });
    expect(result).toContainEqual({ nip: "2222222222", month: "2026-01-01", totalGrosze: 300000 });
  });

  it("zwraca pustą listę dla braku faktów", () => {
    expect(aggregateMonthlyRevenuePerClient([])).toEqual([]);
  });
});
