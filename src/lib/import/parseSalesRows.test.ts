import { describe, expect, it } from "vitest";
import { parseSalesRows } from "./parseSalesRows";

const HEADER_9_PLUS_3_MONTHS = [
  "lp",
  "nazwa klienta",
  "NIP",
  "numer dokumentu",
  "wartość netto",
  "F",
  "G",
  "H",
  "I",
  "2024/01",
  "2024/02",
  "2024/03",
];

describe("parseSalesRows", () => {
  it("pomija jedyny wiersz nagłówkowy", () => {
    const result = parseSalesRows([HEADER_9_PLUS_3_MONTHS, [1, "Firma A", "1234567890", "FVS/2024/01/0001", 1200, 1, null, null, null, 400, 400, 400]]);
    expect(result.rows).toHaveLength(1);
  });

  it("numeruje wersy źródłowe zgodnie z pozycją w pliku (nagłówek = wers 1)", () => {
    const result = parseSalesRows([
      HEADER_9_PLUS_3_MONTHS,
      [1, "Firma A", "1234567890", "FVS/2024/01/0001", 1200, 1, null, null, null, 400, 400, 400],
      [2, "Firma B", "1234567891", "FVS/2024/01/0002", 500, null, null, null, 1, 500, null, null],
    ]);
    expect(result.rows[0].sourceRowNumber).toBe(2);
    expect(result.rows[1].sourceRowNumber).toBe(3);
  });

  it("wykrywa zakres kolumn miesięcznych dynamicznie, zaczynając od stycznia 2024", () => {
    const result = parseSalesRows([HEADER_9_PLUS_3_MONTHS]);
    expect(result.monthRange).toEqual({ fromYear: 2024, fromMonth: 1, toYear: 2024, toMonth: 3 });
  });

  it("zwraca null jako zakres miesięcy, gdy plik nie ma kolumn miesięcznych", () => {
    const result = parseSalesRows([HEADER_9_PLUS_3_MONTHS.slice(0, 9)]);
    expect(result.monthRange).toBeNull();
  });

  it("traktuje puste komórki w kolumnach miesięcy jako 0 (SPEC.md II.4)", () => {
    const result = parseSalesRows([
      HEADER_9_PLUS_3_MONTHS,
      [1, "Firma A", "1234567890", "FVS/2024/01/0001", 1200, 1, null, null, null, 1200, null, null],
    ]);
    expect(result.rows[0].monthlyAmountsGrosze).toEqual([120000, 0, 0]);
  });

  it("konwertuje kwoty PLN na grosze (liczby całkowite)", () => {
    const result = parseSalesRows([
      HEADER_9_PLUS_3_MONTHS,
      [1, "Firma A", "1234567890", "FVS/2024/01/0001", 172.5, 1, null, null, null, 172.5, null, null],
    ]);
    expect(result.rows[0].netAmountGrosze).toBe(17250);
    expect(result.rows[0].monthlyAmountsGrosze[0]).toBe(17250);
  });

  it("odczytuje flagi jako surowe wartości logiczne, bez walidacji reguł", () => {
    const result = parseSalesRows([
      HEADER_9_PLUS_3_MONTHS,
      [1, "Firma A", "1234567890", "FVS/2024/01/0001", 1200, 1, 1, null, null, 1200, null, null], // dwie flagi - błąd biznesowy, ale to nie zadanie tego parsera
    ]);
    expect(result.rows[0].flags).toEqual({ F: true, G: true, H: false, I: false });
  });

  it("wyodrębnia typ dokumentu z numeru dokumentu", () => {
    const result = parseSalesRows([
      HEADER_9_PLUS_3_MONTHS,
      [1, "Firma A", "1234567890", "FKS/2024/02/0001", -1200, null, null, null, null, -1200, null, null],
    ]);
    expect(result.rows[0].documentType).toBe("FKS");
  });
});
