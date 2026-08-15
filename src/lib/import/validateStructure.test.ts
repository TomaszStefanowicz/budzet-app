import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { validateFileStructure } from "./validateStructure";
import { parseWorkbookBuffer } from "./parseWorkbook";

const HEADER = [
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
];

const VALID_NIP = "5260001246"; // suma kontrolna poprawna (SPEC.md II.5.d)
const INVALID_NIP_CHECKSUM = "5260001240";
const VALID_VAT_EU = "DE123456789";

function validRow(overrides: Record<number, unknown> = {}): unknown[] {
  const base: unknown[] = [20, "Firma Testowa", VALID_NIP, "FVS/2024/01/0001", 1200, 1, null, null, null, 1200, null];
  Object.entries(overrides).forEach(([index, value]) => {
    base[Number(index)] = value;
  });
  return base;
}

function messagesFor(rowNumber: number, errors: { sourceRowNumber: number; message: string }[]): string[] {
  return errors.filter((e) => e.sourceRowNumber === rowNumber).map((e) => e.message);
}

describe("validateFileStructure", () => {
  it("nie zgłasza błędów dla w pełni poprawnego wersu", () => {
    const errors = validateFileStructure([HEADER, validRow()]);
    expect(errors).toEqual([]);
  });

  it("zgłasza błąd układu, gdy plik ma mniej niż 9 kolumn", () => {
    const errors = validateFileStructure([HEADER.slice(0, 5), validRow().slice(0, 5)]);
    expect(errors).toEqual([
      { sourceRowNumber: 1, message: expect.stringContaining("za mało kolumn") },
    ]);
  });

  it("zgłasza błąd układu, gdy plik nie ma kolumn miesięcznych", () => {
    const errors = validateFileStructure([HEADER.slice(0, 9), validRow().slice(0, 9)]);
    expect(errors.some((e) => e.sourceRowNumber === 1 && e.message.includes("kolumn miesięcznych"))).toBe(true);
  });

  describe("kolumny A-E nie mogą być puste", () => {
    it.each([0, 1, 2, 3, 4])("zgłasza błąd, gdy kolumna o indeksie %i jest pusta", (index) => {
      const errors = validateFileStructure([HEADER, validRow({ [index]: null })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Brak wartości"))).toBe(true);
    });
  });

  describe("kolumna A - liczba porządkowa", () => {
    it("akceptuje kolejne liczby całkowite", () => {
      const errors = validateFileStructure([HEADER, validRow({ 0: 20 }), validRow({ 0: 21 })]);
      expect(errors).toEqual([]);
    });

    it("zgłasza błąd, gdy liczba porządkowa nie jest kolejna", () => {
      const errors = validateFileStructure([HEADER, validRow({ 0: 20 }), validRow({ 0: 25 })]);
      expect(messagesFor(3, errors).some((m) => m.includes("nie jest kolejna"))).toBe(true);
    });

    it("zgłasza błąd, gdy kolumna A nie jest liczbą całkowitą", () => {
      const errors = validateFileStructure([HEADER, validRow({ 0: 20.5 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("liczbę całkowitą"))).toBe(true);
    });
  });

  describe("kolumna B - nazwa klienta", () => {
    it("zgłasza błąd, gdy nazwa ma mniej niż 3 znaki", () => {
      const errors = validateFileStructure([HEADER, validRow({ 1: "Ab" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("co najmniej 3 znaki"))).toBe(true);
    });

    it("akceptuje nazwę o długości dokładnie 3 znaków", () => {
      const errors = validateFileStructure([HEADER, validRow({ 1: "ABC" })]);
      expect(errors.some((e) => e.message.includes("3 znaki"))).toBe(false);
    });
  });

  describe("kolumna C - NIP / VAT UE", () => {
    it("akceptuje poprawny polski NIP (suma kontrolna)", () => {
      const errors = validateFileStructure([HEADER, validRow({ 2: VALID_NIP })]);
      expect(errors).toEqual([]);
    });

    it("odrzuca polski NIP z błędną sumą kontrolną", () => {
      const errors = validateFileStructure([HEADER, validRow({ 2: INVALID_NIP_CHECKSUM })]);
      expect(messagesFor(2, errors).some((m) => m.includes("NIP/numer VAT UE"))).toBe(true);
    });

    it("akceptuje poprawny numer VAT UE", () => {
      const errors = validateFileStructure([HEADER, validRow({ 2: VALID_VAT_EU })]);
      expect(errors).toEqual([]);
    });

    it("odrzuca nieprawidłowy format VAT UE", () => {
      const errors = validateFileStructure([HEADER, validRow({ 2: "D1234567" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("NIP/numer VAT UE"))).toBe(true);
    });
  });

  describe("kolumna D - numer dokumentu", () => {
    it("odrzuca numer dokumentu w złym formacie", () => {
      const errors = validateFileStructure([HEADER, validRow({ 3: "FVS-2024-01-0001" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("TYP/rrrr/mm/nnnn"))).toBe(true);
    });

    it("odrzuca nieprawidłowy miesiąc w numerze dokumentu", () => {
      const errors = validateFileStructure([HEADER, validRow({ 3: "FVS/2024/13/0001" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("TYP/rrrr/mm/nnnn"))).toBe(true);
    });
  });

  describe("kolumna E - wartość netto", () => {
    it("odrzuca wartość zero", () => {
      const errors = validateFileStructure([HEADER, validRow({ 4: 0, 9: 0, 10: 0 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("nie może być równa zero"))).toBe(true);
    });

    it("odrzuca wartość ujemną dla dokumentu innego niż FKS", () => {
      const errors = validateFileStructure([HEADER, validRow({ 4: -100 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("fakturą korygującą"))).toBe(true);
    });

    it("akceptuje wartość ujemną dla FKS", () => {
      const errors = validateFileStructure([
        HEADER,
        validRow({ 3: "FKS/2024/01/0001", 4: -100, 5: null, 9: -100, 10: null }),
      ]);
      expect(errors).toEqual([]);
    });

    it("odrzuca nienumeryczną wartość netto", () => {
      const errors = validateFileStructure([HEADER, validRow({ 4: "sto złotych" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Wartość netto (kolumna E) musi być liczbą"))).toBe(true);
    });
  });

  describe("kolumny F-I - flagi", () => {
    it("odrzuca brak jakiejkolwiek flagi", () => {
      const errors = validateFileStructure([HEADER, validRow({ 5: null })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Brak ustawionej flagi"))).toBe(true);
    });

    it("odrzuca więcej niż jedną ustawioną flagę", () => {
      const errors = validateFileStructure([HEADER, validRow({ 5: 1, 6: 1 })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Więcej niż jedna flaga"))).toBe(true);
    });

    it("odrzuca wartość flagi inną niż liczba 1", () => {
      const errors = validateFileStructure([HEADER, validRow({ 5: "x" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("nieprawidłową wartość flagi"))).toBe(true);
    });

    it("akceptuje flagę I (zakup incydentalny) na tych samych zasadach co F/G/H", () => {
      const errors = validateFileStructure([HEADER, validRow({ 5: null, 8: 1 })]);
      expect(errors).toEqual([]);
    });

    it("odrzuca FKS z ustawioną flagą", () => {
      const errors = validateFileStructure([
        HEADER,
        validRow({ 3: "FKS/2024/01/0001", 4: -100, 5: 1, 9: -100, 10: null }),
      ]);
      expect(messagesFor(2, errors).some((m) => m.includes("nie powinna mieć ustawionej flagi"))).toBe(true);
    });
  });

  describe("kolumny miesięczne", () => {
    it("odrzuca wers bez żadnego przychodu w kolumnach miesięcznych", () => {
      const errors = validateFileStructure([HEADER, validRow({ 9: null, 10: null })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Brak przychodu"))).toBe(true);
    });

    it("traktuje puste komórki miesięczne jako 0 (SPEC.md II.4), akceptując wers z choć jednym niezerowym miesiącem", () => {
      const errors = validateFileStructure([HEADER, validRow({ 9: 1200, 10: null })]);
      expect(errors).toEqual([]);
    });

    it("odrzuca nienumeryczną wartość w kolumnie miesięcznej", () => {
      const errors = validateFileStructure([HEADER, validRow({ 9: "brak danych" })]);
      expect(messagesFor(2, errors).some((m) => m.includes("Nieprawidłowy format kwoty"))).toBe(true);
    });
  });

  it("zgłasza wszystkie błędy jednocześnie, nie tylko pierwszy (SPEC.md II.3.i)", () => {
    const errors = validateFileStructure([HEADER, validRow({ 1: "Ab", 2: "niepoprawny-nip", 5: null })]);
    expect(messagesFor(2, errors).length).toBeGreaterThanOrEqual(3);
  });
});

describe("validateFileStructure (integracja na pliku syntetycznym)", () => {
  it("nie zgłasza błędów strukturalnych dla test-data/dane-syntetyczne-clean.xlsx", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-clean.xlsx");
    const buffer = readFileSync(filePath);

    const rawRows = parseWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    const errors = validateFileStructure(rawRows);

    expect(errors).toEqual([]);
  });

  it("wykrywa celowe błędy strukturalne (brak flagi, dwie flagi) w test-data/dane-syntetyczne-with-errors.xlsx", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-with-errors.xlsx");
    const buffer = readFileSync(filePath);

    const rawRows = parseWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    const errors = validateFileStructure(rawRows);

    expect(errors.some((e) => e.message.includes("Brak ustawionej flagi"))).toBe(true);
    expect(errors.some((e) => e.message.includes("Więcej niż jedna flaga"))).toBe(true);
  });
});
