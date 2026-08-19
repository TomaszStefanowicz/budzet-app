import { describe, expect, it } from "vitest";
import { documentsCountLabel } from "./ClientReportTable";

describe("documentsCountLabel", () => {
  it("używa mianownika liczby mnogiej dla 2-4", () => {
    expect(documentsCountLabel(2)).toBe("2 dokumenty");
    expect(documentsCountLabel(3)).toBe("3 dokumenty");
    expect(documentsCountLabel(4)).toBe("4 dokumenty");
  });

  it("używa dopełniacza liczby mnogiej od 5 wzwyż", () => {
    expect(documentsCountLabel(5)).toBe("5 dokumentów");
    expect(documentsCountLabel(9)).toBe("9 dokumentów");
    expect(documentsCountLabel(10)).toBe("10 dokumentów");
  });

  it("wyjątek 12-14 mimo końcówki 2-4 to dopełniacz", () => {
    expect(documentsCountLabel(12)).toBe("12 dokumentów");
    expect(documentsCountLabel(13)).toBe("13 dokumentów");
    expect(documentsCountLabel(14)).toBe("14 dokumentów");
  });

  it("liczby powyżej 20 wracają do reguły końcówki", () => {
    expect(documentsCountLabel(22)).toBe("22 dokumenty");
    expect(documentsCountLabel(24)).toBe("24 dokumenty");
    expect(documentsCountLabel(25)).toBe("25 dokumentów");
  });
});
