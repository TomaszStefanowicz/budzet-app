import { describe, expect, it } from "vitest";
import { sumByFlag } from "./sumByFlag";

describe("sumByFlag", () => {
  it("sumuje kwoty w rozbiciu na flagi", () => {
    const result = sumByFlag([
      { flag: "F", amountGrosze: 100000 },
      { flag: "F", amountGrosze: 50000 },
      { flag: "G", amountGrosze: 20000 },
      { flag: "H", amountGrosze: 30000 },
      { flag: "I", amountGrosze: 5000 },
    ]);
    expect(result).toEqual({ total: 205000, F: 150000, G: 20000, H: 30000, I: 5000, corrections: 0 });
  });

  it("wyodrębnia korekty (flag: null) jako osobną pozycję, nie wliczaną do F/G/H/I", () => {
    const result = sumByFlag([
      { flag: "F", amountGrosze: 100000 },
      { flag: null, amountGrosze: -30000 },
    ]);
    expect(result).toEqual({ total: 70000, F: 100000, G: 0, H: 0, I: 0, corrections: -30000 });
  });

  it("test kontrolny (SPEC.md, PLAN.md 2.2): F + G + H + I + corrections = total", () => {
    const facts = [
      { flag: "F" as const, amountGrosze: 120000 },
      { flag: "G" as const, amountGrosze: 80000 },
      { flag: "H" as const, amountGrosze: 15000 },
      { flag: "I" as const, amountGrosze: 5000 },
      { flag: null, amountGrosze: -40000 }, // korekta częściowa
    ];
    const result = sumByFlag(facts);
    expect(result.F + result.G + result.H + result.I + result.corrections).toBe(result.total);
  });

  it("zwraca zera dla braku faktów", () => {
    expect(sumByFlag([])).toEqual({ total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 });
  });
});
