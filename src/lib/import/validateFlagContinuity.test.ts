import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { validateFlagContinuity } from "./validateFlagContinuity";
import { parseWorkbookBuffer } from "./parseWorkbook";

const NIP = "5260001246";

/** Buduje surowe wersy: nagłówek + wersy przekazane jako [flagColumn, startIdx, duration][]. */
function buildRows(
  packages: { flag: "F" | "G" | "H" | "I"; startIdx: number; duration: number; nip?: string }[],
  monthColumnCount = 40
): unknown[][] {
  const header = Array(9 + monthColumnCount).fill("h");
  const rows: unknown[][] = [header];

  packages.forEach((pkg, i) => {
    const row: unknown[] = Array(9 + monthColumnCount).fill(null);
    row[0] = i + 1;
    row[1] = "Firma Testowa";
    row[2] = pkg.nip ?? NIP;
    row[3] = `FVS/2024/01/${String(i + 1).padStart(4, "0")}`;
    row[4] = 1200;
    row[5] = pkg.flag === "F" ? 1 : null;
    row[6] = pkg.flag === "G" ? 1 : null;
    row[7] = pkg.flag === "H" ? 1 : null;
    row[8] = pkg.flag === "I" ? 1 : null;
    for (let m = 0; m < pkg.duration; m++) {
      row[9 + pkg.startIdx + m] = 100;
    }
    rows.push(row);
  });

  return rows;
}

function messages(errors: { sourceRowNumber: number; message: string }[]): string[] {
  return errors.map((e) => e.message);
}

describe("validateFlagContinuity", () => {
  it("akceptuje pierwszy wers z flagą F (brak wcześniejszej historii)", () => {
    const rows = buildRows([{ flag: "F", startIdx: 0, duration: 12 }]);
    expect(validateFlagContinuity(rows)).toEqual([]);
  });

  it("akceptuje powrót po 13 miesiącach z flagą F (gap > 12)", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 }, // kończy się w indeksie 11
      { flag: "F", startIdx: 24, duration: 12 }, // gap = 24 - 11 = 13
    ]);
    expect(validateFlagContinuity(rows)).toEqual([]);
  });

  it("odrzuca powrót po 13 miesiącach błędnie oznaczony jako G (gap > 12 -> powinno być F)", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 },
      { flag: "G", startIdx: 24, duration: 12 },
    ]);
    const errors = validateFlagContinuity(rows);
    expect(messages(errors).some((m) => m.includes("powinna być flaga F"))).toBe(true);
  });

  it("akceptuje powrót po 11 miesiącach z flagą G (gap <= 12)", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 },
      { flag: "G", startIdx: 22, duration: 12 },
    ]);
    expect(validateFlagContinuity(rows)).toEqual([]);
  });

  it("odrzuca powrót po 11 miesiącach błędnie oznaczony jako F (gap <= 12 -> powinno być G)", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 },
      { flag: "F", startIdx: 22, duration: 12 },
    ]);
    const errors = validateFlagContinuity(rows);
    expect(messages(errors).some((m) => m.includes("powinna być flaga G"))).toBe(true);
  });

  it("akceptuje flagę G dokładnie na granicy 12 miesięcy przerwy (gap == 12)", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 }, // koniec = 11
      { flag: "G", startIdx: 23, duration: 12 }, // gap = 23 - 11 = 12
    ]);
    expect(validateFlagContinuity(rows)).toEqual([]);
  });

  it("odrzuca flagę F dokładnie na granicy 12 miesięcy przerwy (gap == 12, powinno być G)", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 },
      { flag: "F", startIdx: 23, duration: 12 }, // gap = 12
    ]);
    const errors = validateFlagContinuity(rows);
    expect(messages(errors).some((m) => m.includes("powinna być flaga G"))).toBe(true);
  });

  describe("reguła horyzontu danych (SPEC.md II.3.g.3)", () => {
    it("akceptuje flagę G bez widocznej historii, gdy start jest w pierwszych 12 miesiącach danych", () => {
      const rows = buildRows([{ flag: "G", startIdx: 5, duration: 12 }]);
      expect(validateFlagContinuity(rows)).toEqual([]);
    });

    it("akceptuje flagę G bez historii dokładnie na granicy horyzontu (startIdx == 11)", () => {
      const rows = buildRows([{ flag: "G", startIdx: 11, duration: 12 }]);
      expect(validateFlagContinuity(rows)).toEqual([]);
    });

    it("odrzuca flagę G bez widocznej historii poza oknem horyzontu (startIdx == 12)", () => {
      const rows = buildRows([{ flag: "G", startIdx: 12, duration: 12 }]);
      const errors = validateFlagContinuity(rows);
      expect(messages(errors).some((m) => m.includes("poza oknem 12 miesięcy"))).toBe(true);
    });
  });

  it("pomija flagę I - nie uczestniczy w łańcuchu ciągłości", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 },
      { flag: "I", startIdx: 20, duration: 1 }, // gdyby liczone, zmieniłoby kolejny gap
      { flag: "G", startIdx: 22, duration: 12 }, // gap liczony od F (koniec 11), nie od I
    ]);
    expect(validateFlagContinuity(rows)).toEqual([]);
  });

  it("pomija flagę H - nie uczestniczy w łańcuchu ciągłości", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12 },
      { flag: "H", startIdx: 20, duration: 3 },
      { flag: "G", startIdx: 22, duration: 12 },
    ]);
    expect(validateFlagContinuity(rows)).toEqual([]);
  });

  it("waliduje każdy NIP niezależnie", () => {
    const rows = buildRows([
      { flag: "F", startIdx: 0, duration: 12, nip: "1111111111" },
      { flag: "F", startIdx: 22, duration: 12, nip: "1111111111" }, // błąd: gap=11, powinno być G
      { flag: "F", startIdx: 0, duration: 12, nip: "2222222222" },
      { flag: "F", startIdx: 24, duration: 12, nip: "2222222222" }, // poprawne: gap=13
    ]);
    const errors = validateFlagContinuity(rows);
    expect(errors).toHaveLength(1);
  });
});

describe("validateFlagContinuity (integracja na pliku syntetycznym)", () => {
  it("nie zgłasza błędów dla test-data/dane-syntetyczne-clean.xlsx", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-clean.xlsx");
    const buffer = readFileSync(filePath);
    const rawRows = parseWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    expect(validateFlagContinuity(rawRows)).toEqual([]);
  });

  it("wykrywa błędne powroty po 11/13 miesiącach w test-data/dane-syntetyczne-with-errors.xlsx", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-with-errors.xlsx");
    const buffer = readFileSync(filePath);
    const rawRows = parseWorkbookBuffer(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
    );
    const errors = validateFlagContinuity(rawRows);
    expect(errors.some((e) => e.message.includes("powinna być flaga G"))).toBe(true);
    expect(errors.some((e) => e.message.includes("powinna być flaga F"))).toBe(true);
  });
});
