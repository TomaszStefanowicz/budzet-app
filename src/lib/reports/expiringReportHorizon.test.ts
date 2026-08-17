import { describe, expect, it } from "vitest";
import { isWithinExpiringHorizon } from "./expiringReportHorizon";

describe("isWithinExpiringHorizon", () => {
  const months = ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"];

  it("odrzuca pierwszy miesiąc zakresu (brak widocznego M-1)", () => {
    expect(isWithinExpiringHorizon(months, "2024-01-01")).toBe(false);
  });

  it("odrzuca ostatni miesiąc zakresu (brak widocznego M+1)", () => {
    expect(isWithinExpiringHorizon(months, "2024-04-01")).toBe(false);
  });

  it("akceptuje miesiąc w środku zakresu", () => {
    expect(isWithinExpiringHorizon(months, "2024-02-01")).toBe(true);
    expect(isWithinExpiringHorizon(months, "2024-03-01")).toBe(true);
  });

  it("odrzuca miesiąc spoza zakresu", () => {
    expect(isWithinExpiringHorizon(months, "2025-01-01")).toBe(false);
  });

  it("odrzuca każdy miesiąc przy zakresie krótszym niż 3 miesiące", () => {
    const shortRange = ["2024-01-01", "2024-02-01"];
    expect(isWithinExpiringHorizon(shortRange, "2024-01-01")).toBe(false);
    expect(isWithinExpiringHorizon(shortRange, "2024-02-01")).toBe(false);
  });
});
