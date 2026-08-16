import { FLAG_COLUMNS, flagColumnLabel, rowIdentity, type StructuralValidationError } from "./validateStructure.ts";

const FIXED_COLUMN_COUNT = 9; // A-I

const KNOWN_DOCUMENT_TYPES = new Set(["FVS", "FKS", "FVZ", "FVZK"]);

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
 * (SPEC.md II.3.e - FVZK nigdy F, skorygowane V.30) i długością rozliczenia dla flagi I
 * (SPEC.md II.2 - dokładnie jeden miesiąc). Zakłada, że kształt danych (format
 * numeru dokumentu, dokładnie jedna flaga) jest już sprawdzony przez
 * validateFileStructure - tu tylko warstwa semantyczna.
 *
 * Długość rozliczenia NIE jest sprawdzana dla flag F/G (SPEC.md II.3.c,
 * skorygowane V.29) - dostęp podstawowy bywa rozliczany też miesięcznie,
 * rozróżnienie F/G vs I opiera się wyłącznie na fladze z pliku źródłowego.
 */
export function validateDocumentAndFlagRules(rawRows: unknown[][]): StructuralValidationError[] {
  const errors: StructuralValidationError[] = [];
  const dataRows = rawRows.slice(1);

  dataRows.forEach((row, i) => {
    const sourceRowNumber = i + 2;

    const identity = rowIdentity(row);

    const docNumberRaw = row[3];
    if (typeof docNumberRaw !== "string") return;

    const documentType = docNumberRaw.split("/")[0];
    if (!KNOWN_DOCUMENT_TYPES.has(documentType)) {
      errors.push({
        sourceRowNumber,
        ...identity,
        message: `Nieznany typ dokumentu (kolumna D): "${documentType}" — dozwolone typy: FVS, FKS, FVZ, FVZK.`,
      });
      return;
    }

    if (documentType === "FKS") return; // FKS nie ma flag (SPEC.md II.3.f)

    const flag = getSingleFlag(row);
    if (flag === null) return; // brak/wielokrotność flagi już zgłoszona przez validateFileStructure

    if (documentType === "FVZK" && flag === "F") {
      errors.push({
        sourceRowNumber,
        ...identity,
        message: `Faktura zaliczkowa końcowa (FVZK) nie może mieć flagi F (${flagColumnLabel("F")}) (SPEC.md II.3.e) — dozwolone G (${flagColumnLabel("G")}), H (${flagColumnLabel("H")}) lub I (${flagColumnLabel("I")}).`,
      });
    }

    if (flag === "I") {
      const nonZeroMonths = countNonZeroMonths(row);
      if (nonZeroMonths !== 1) {
        errors.push({
          sourceRowNumber,
          ...identity,
          message: `Flaga I (${flagColumnLabel("I")}) wymaga rozliczenia w dokładnie jednym miesiącu, znaleziono ${nonZeroMonths}.`,
        });
      }
    }
  });

  return errors;
}
