import type { StructuralValidationError } from "./validateStructure";

const FIXED_COLUMN_COUNT = 9; // A-I

const KNOWN_DOCUMENT_TYPES = new Set(["FVS", "FKS", "FVZ", "FVZK"]);

const FLAG_COLUMNS = [
  { index: 5, letter: "F" },
  { index: 6, letter: "G" },
  { index: 7, letter: "H" },
  { index: 8, letter: "I" },
];

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function countNonZeroMonths(row: unknown[]): number {
  return row.slice(FIXED_COLUMN_COUNT).filter((cell) => typeof cell === "number" && cell !== 0).length;
}

/** Zwraca literę jedynej ustawionej flagi, albo null gdy flag jest 0 lub >1 (ten przypadek zgłasza już validateFileStructure). */
function getSingleFlag(row: unknown[]): string | null {
  const setFlags = FLAG_COLUMNS.filter(({ index }) => !isBlank(row[index]));
  return setFlags.length === 1 ? setFlags[0].letter : null;
}

/**
 * Waliduje typ dokumentu (SPEC.md II.3.h) oraz spójność flagi z typem dokumentu
 * i liczbą miesięcy rozliczeniowych w wersie (SPEC.md II.3.c, II.3.e). Zakłada,
 * że kształt danych (format numeru dokumentu, dokładnie jedna flaga) jest już
 * sprawdzony przez validateFileStructure - tu tylko warstwa semantyczna.
 */
export function validateDocumentAndFlagRules(rawRows: unknown[][]): StructuralValidationError[] {
  const errors: StructuralValidationError[] = [];
  const dataRows = rawRows.slice(1);

  dataRows.forEach((row, i) => {
    const sourceRowNumber = i + 2;

    const docNumberRaw = row[3];
    if (typeof docNumberRaw !== "string") return;

    const documentType = docNumberRaw.split("/")[0];
    if (!KNOWN_DOCUMENT_TYPES.has(documentType)) {
      errors.push({
        sourceRowNumber,
        message: `Nieznany typ dokumentu (kolumna D): "${documentType}" — dozwolone typy: FVS, FKS, FVZ, FVZK.`,
      });
      return;
    }

    if (documentType === "FKS") return; // FKS nie ma flag (SPEC.md II.3.f)

    const flag = getSingleFlag(row);
    if (flag === null) return; // brak/wielokrotność flagi już zgłoszona przez validateFileStructure

    if (documentType === "FVZK" && flag !== "H" && flag !== "I") {
      errors.push({
        sourceRowNumber,
        message: `Faktura zaliczkowa końcowa (FVZK) może mieć wyłącznie flagę H lub I, znaleziono ${flag}.`,
      });
    }

    const nonZeroMonths = countNonZeroMonths(row);
    if ((flag === "F" || flag === "G") && nonZeroMonths < 2) {
      errors.push({
        sourceRowNumber,
        message: `Flaga ${flag} wymaga rozliczenia w co najmniej 2 miesiącach — pakiety jednomiesięczne muszą być oznaczone jako I (SPEC.md II.3.c).`,
      });
    }
    if (flag === "I" && nonZeroMonths !== 1) {
      errors.push({
        sourceRowNumber,
        message: `Flaga I (zakup incydentalny) wymaga rozliczenia w dokładnie jednym miesiącu, znaleziono ${nonZeroMonths}.`,
      });
    }
  });

  return errors;
}
