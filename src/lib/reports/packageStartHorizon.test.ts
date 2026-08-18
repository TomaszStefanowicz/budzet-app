import { describe, expect, it } from "vitest";
import { isWithinPackageStartHorizon } from "./packageStartHorizon";

describe("isWithinPackageStartHorizon", () => {
  const months = ["2024-01-01", "2024-02-01", "2024-03-01", "2024-04-01"];

  it("akceptuje pierwszy miesiąc zakresu (w przeciwieństwie do zestawienia 13)", () => {
    expect(isWithinPackageStartHorizon(months, "2024-01-01")).toBe(true);
  });

  it("odrzuca ostatni miesiąc zakresu (brak widocznego M+1 do policzenia wartości)", () => {
    expect(isWithinPackageStartHorizon(months, "2024-04-01")).toBe(false);
  });

  it("akceptuje miesiąc w środku zakresu", () => {
    expect(isWithinPackageStartHorizon(months, "2024-02-01")).toBe(true);
    expect(isWithinPackageStartHorizon(months, "2024-03-01")).toBe(true);
  });

  it("odrzuca miesiąc spoza zakresu", () => {
    expect(isWithinPackageStartHorizon(months, "2025-01-01")).toBe(false);
  });

  it("odrzuca jedyny miesiąc, gdy zakres ma długość 1", () => {
    expect(isWithinPackageStartHorizon(["2024-01-01"], "2024-01-01")).toBe(false);
  });
});
