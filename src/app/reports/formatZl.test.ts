import { describe, expect, it } from "vitest";
import { formatZl } from "./formatZl";

describe("formatZl", () => {
  it("wstawia spację co trzy cyfry i przecinek dziesiętny", () => {
    expect(formatZl(31_683_750)).toBe("316 837,50 zł");
    expect(formatZl(434_084)).toBe("4 340,84 zł");
  });

  it("obsługuje kwoty bez grupowania tysięcy", () => {
    expect(formatZl(50_000)).toBe("500,00 zł");
  });

  it("obsługuje zero", () => {
    expect(formatZl(0)).toBe("0,00 zł");
  });

  it("obsługuje wartości ujemne (korekty)", () => {
    expect(formatZl(-500)).toBe("-5,00 zł");
  });

  it("grupuje wielokrotności tysiąca poprawnie na granicy", () => {
    expect(formatZl(100_000)).toBe("1 000,00 zł");
    expect(formatZl(100_000_000)).toBe("1 000 000,00 zł");
  });
});
