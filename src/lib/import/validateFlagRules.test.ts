import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { validateDocumentAndFlagRules } from "./validateFlagRules";
import { parseWorkbookBuffer } from "./parseWorkbook";

const HEADER = ["lp", "nazwa klienta", "NIP", "numer dokumentu", "wartość netto", "F", "G", "H", "I", "2024/01", "2024/02", "2024/03"];

function row(overrides: Record<number, unknown> = {}): unknown[] {
  const base: unknown[] = [20, "Firma Testowa", "5260001246", "FVS/2024/01/0001", 1200, null, null, null, null, 1200, 1200, null];
  Object.entries(overrides).forEach(([index, value]) => {
    base[Number(index)] = value;
  });
  return base;
}

function messagesFor(rowNumber: number, errors: { sourceRowNumber: number; message: string }[]): string[] {
  return errors.filter((e) => e.sourceRowNumber === rowNumber).map((e) => e.message);
}

describe("validateDocumentAndFlagRules", () => {
  describe("typ dokumentu (SPEC.md II.3.h)", () => {
    it("akceptuje znane typy dokumentów", () => {
      for (const type of ["FVS", "FKS", "FVZ", "FVZK"]) {
        const docNumber = `${type}/2024/01/0001`;
        const overrides =
          type === "FKS"
            ? { 3: docNumber, 4: -1200, 5: null, 6: null, 7: null, 8: null, 9: -1200, 10: null }
            : type === "FVZK"
              ? { 3: docNumber, 5: null, 7: 1 }
              : { 3: docNumber };
        const errors = validateDocumentAndFlagRules([HEADER, row(overrides)]);
        expect(errors).toEqual([]);
      }
    });

    it("odrzuca nieznany typ dokumentu", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 3: "XYZ/2024/01/0001" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Nieznany typ dokumentu"))).toBe(true);
    });
  });

  describe("FVZK - wyłącznie flaga H lub I (SPEC.md II.3.e)", () => {
    it("odrzuca FVZK z flagą F", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 3: "FVZK/2024/01/0001", 5: 1 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("FVZK") && m.includes("H lub I"))).toBe(true);
    });

    it("odrzuca FVZK z flagą G", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 3: "FVZK/2024/01/0001", 6: 1 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("FVZK") && m.includes("H lub I"))).toBe(true);
    });

    it("akceptuje FVZK z flagą H", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 3: "FVZK/2024/01/0001", 7: 1 })]);
      expect(errors).toEqual([]);
    });

    it("akceptuje FVZK z flagą I (jeden miesiąc)", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 3: "FVZK/2024/01/0001", 8: 1, 9: 1200, 10: null })]);
      expect(errors).toEqual([]);
    });
  });

  describe("flaga F/G wymaga co najmniej 2 miesięcy (SPEC.md II.3.c)", () => {
    it("odrzuca flagę F z rozliczeniem tylko w jednym miesiącu", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 5: 1, 9: 1200, 10: null })]);
      expect(messagesFor(2, errors).some((m) => m.includes("co najmniej 2 miesiącach"))).toBe(true);
    });

    it("akceptuje flagę G z rozliczeniem w dwóch miesiącach", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 6: 1, 5: null, 9: 600, 10: 600 })]);
      expect(errors).toEqual([]);
    });
  });

  describe("flaga I wymaga dokładnie jednego miesiąca (SPEC.md II.2)", () => {
    it("odrzuca flagę I z rozliczeniem w dwóch miesiącach", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 8: 1, 5: null, 9: 600, 10: 600 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("dokładnie jednym miesiącu"))).toBe(true);
    });

    it("akceptuje flagę I z rozliczeniem w jednym miesiącu", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 8: 1, 5: null, 9: 1200, 10: null })]);
      expect(errors).toEqual([]);
    });
  });

  describe("flaga H - brak ograniczenia liczby miesięcy", () => {
    it("akceptuje flagę H z jednym miesiącem", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 7: 1, 5: null, 9: 1200, 10: null })]);
      expect(errors).toEqual([]);
    });

    it("akceptuje flagę H z wieloma miesiącami", () => {
      const errors = validateDocumentAndFlagRules([HEADER, row({ 7: 1, 5: null, 9: 400, 10: 400 })]);
      expect(errors).toEqual([]);
    });
  });

  it("pomija wers FKS (bez flag)", () => {
    const errors = validateDocumentAndFlagRules([
      HEADER,
      row({ 3: "FKS/2024/01/0001", 4: -1200, 5: null, 9: -1200, 10: null }),
    ]);
    expect(errors).toEqual([]);
  });

  it("pomija wers z wieloma ustawionymi flagami (błąd zgłasza już validateFileStructure)", () => {
    const errors = validateDocumentAndFlagRules([HEADER, row({ 5: 1, 6: 1, 9: 1200, 10: null })]);
    expect(errors).toEqual([]);
  });

  it("pomija wers bez żadnej flagi (błąd zgłasza już validateFileStructure)", () => {
    const errors = validateDocumentAndFlagRules([HEADER, row({ 5: null, 9: 1200, 10: null })]);
    expect(errors).toEqual([]);
  });

  it("pomija wers z nieprawidłowym (nietekstowym) numerem dokumentu", () => {
    const errors = validateDocumentAndFlagRules([HEADER, row({ 3: 12345 })]);
    expect(errors).toEqual([]);
  });
});

describe("validateDocumentAndFlagRules (integracja na pliku syntetycznym)", () => {
  it("nie zgłasza błędów dla test-data/dane-syntetyczne-clean.xlsx", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-clean.xlsx");
    const buffer = readFileSync(filePath);
    const rawRows = parseWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    expect(validateDocumentAndFlagRules(rawRows)).toEqual([]);
  });

  it("wykrywa nieznany typ dokumentu w test-data/dane-syntetyczne-with-errors.xlsx", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-with-errors.xlsx");
    const buffer = readFileSync(filePath);
    const rawRows = parseWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    const errors = validateDocumentAndFlagRules(rawRows);
    expect(errors.some((e) => e.message.includes("Nieznany typ dokumentu"))).toBe(true);
  });
});
