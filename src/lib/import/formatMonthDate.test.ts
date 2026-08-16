import { describe, expect, it } from "vitest";
import { formatMonthDate } from "./formatMonthDate";

describe("formatMonthDate", () => {
  it("formatuje miesiąc jako datę z pierwszym dniem miesiąca", () => {
    expect(formatMonthDate({ year: 2024, month: 3 })).toBe("2024-03-01");
  });

  it("dopełnia miesiąc zerem wiodącym", () => {
    expect(formatMonthDate({ year: 2024, month: 1 })).toBe("2024-01-01");
  });

  it("nie dopełnia miesięcy dwucyfrowych", () => {
    expect(formatMonthDate({ year: 2027, month: 12 })).toBe("2027-12-01");
  });
});
