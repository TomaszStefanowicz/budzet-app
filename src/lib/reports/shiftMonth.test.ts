import { describe, expect, it } from "vitest";
import { shiftMonth } from "./shiftMonth";

describe("shiftMonth", () => {
  it("przesuwa w przód wewnątrz roku", () => {
    expect(shiftMonth("2026-03-01", 1)).toBe("2026-04-01");
  });

  it("przesuwa w tył wewnątrz roku", () => {
    expect(shiftMonth("2026-03-01", -1)).toBe("2026-02-01");
  });

  it("przechodzi przez granicę roku w przód", () => {
    expect(shiftMonth("2026-12-01", 1)).toBe("2027-01-01");
  });

  it("przechodzi przez granicę roku w tył", () => {
    expect(shiftMonth("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("delta 0 zwraca ten sam miesiąc", () => {
    expect(shiftMonth("2026-06-01", 0)).toBe("2026-06-01");
  });
});
