import { describe, expect, it } from "vitest";
import { formatGroszeAsDecimal } from "./formatGroszeAsDecimal";

describe("formatGroszeAsDecimal", () => {
  it("formatuje kwotę dodatnią", () => {
    expect(formatGroszeAsDecimal(1234)).toBe("12.34");
  });

  it("formatuje kwotę ujemną (korekta FKS)", () => {
    expect(formatGroszeAsDecimal(-1234)).toBe("-12.34");
  });

  it("formatuje zero", () => {
    expect(formatGroszeAsDecimal(0)).toBe("0.00");
  });

  it("dopełnia grosze jednocyfrowe zerem wiodącym", () => {
    expect(formatGroszeAsDecimal(5)).toBe("0.05");
  });

  it("formatuje pełne złotówki bez reszty groszowej", () => {
    expect(formatGroszeAsDecimal(120000)).toBe("1200.00");
  });

  it("formatuje ujemną kwotę mniejszą niż 1 zł", () => {
    expect(formatGroszeAsDecimal(-5)).toBe("-0.05");
  });
});
