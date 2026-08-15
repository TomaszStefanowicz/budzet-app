const FIXED_COLUMN_COUNT = 9; // A-I

export interface StructuralValidationError {
  sourceRowNumber: number; // numer wersu w pliku źródłowym (wers 1 = nagłówek)
  message: string;
}

const FIELD_NAMES = [
  "A (liczba porządkowa)",
  "B (nazwa klienta)",
  "C (NIP)",
  "D (numer dokumentu)",
  "E (wartość netto)",
];

const DOCUMENT_NUMBER_PATTERN = /^[A-Z]+\/\d{4}\/(0[1-9]|1[0-2])\/\d{4}$/;

const FLAG_COLUMNS = [
  { index: 5, letter: "F" },
  { index: 6, letter: "G" },
  { index: 7, letter: "H" },
  { index: 8, letter: "I" },
];

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function normalizeNip(raw: unknown): string {
  return String(raw ?? "")
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

function isValidPolishNip(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const checksum = sum % 11;
  if (checksum === 10) return false;
  return checksum === Number(digits[9]);
}

function isValidEuVat(value: string): boolean {
  return /^[A-Z]{2}\d{2,12}$/.test(value);
}

function isValidNipOrVatEu(raw: unknown): boolean {
  const normalized = normalizeNip(raw);
  if (normalized === "") return false;
  if (/^\d+$/.test(normalized)) return isValidPolishNip(normalized);
  return isValidEuVat(normalized);
}

/**
 * Waliduje kształt danych wersu po wersie (SPEC.md II.5) - niezależnie od
 * walidacji typów dokumentów i reguł semantycznych flag (SPEC.md II.3, PLAN.md 1.3).
 * Czysta funkcja, bez dostępu do bazy. Zwraca wszystkie błędy naraz (SPEC.md II.3.i).
 */
export function validateFileStructure(rawRows: unknown[][]): StructuralValidationError[] {
  const errors: StructuralValidationError[] = [];
  const headerWidth = rawRows[0]?.length ?? 0;

  if (headerWidth < FIXED_COLUMN_COUNT) {
    errors.push({
      sourceRowNumber: 1,
      message: `Plik ma za mało kolumn — oczekiwano co najmniej ${FIXED_COLUMN_COUNT} kolumn (A-I), znaleziono ${headerWidth}.`,
    });
    return errors;
  }

  const monthColumnCount = headerWidth - FIXED_COLUMN_COUNT;
  if (monthColumnCount === 0) {
    errors.push({ sourceRowNumber: 1, message: "Plik nie zawiera żadnych kolumn miesięcznych (od kolumny J)." });
  }

  const dataRows = rawRows.slice(1);
  let expectedLp: number | null = null;

  dataRows.forEach((row, i) => {
    const sourceRowNumber = i + 2;

    for (let col = 0; col < 5; col++) {
      if (isBlank(row[col])) {
        errors.push({ sourceRowNumber, message: `Brak wartości w kolumnie ${FIELD_NAMES[col]}.` });
      }
    }

    const lpRaw = row[0];
    if (typeof lpRaw === "number" && Number.isInteger(lpRaw)) {
      if (expectedLp !== null && lpRaw !== expectedLp) {
        errors.push({
          sourceRowNumber,
          message: `Liczba porządkowa (kolumna A) nie jest kolejna — oczekiwano ${expectedLp}, znaleziono ${lpRaw}.`,
        });
      }
      expectedLp = lpRaw + 1;
    } else if (!isBlank(lpRaw)) {
      errors.push({ sourceRowNumber, message: "Kolumna A (liczba porządkowa) musi zawierać liczbę całkowitą." });
      expectedLp = null;
    } else {
      expectedLp = null;
    }

    const nameRaw = row[1];
    if ((typeof nameRaw === "string" || typeof nameRaw === "number") && String(nameRaw).trim().length < 3) {
      errors.push({ sourceRowNumber, message: "Nazwa klienta (kolumna B) musi mieć co najmniej 3 znaki." });
    }

    const nipRaw = row[2];
    if (!isBlank(nipRaw) && !isValidNipOrVatEu(nipRaw)) {
      errors.push({ sourceRowNumber, message: `NIP/numer VAT UE (kolumna C) ma nieprawidłowy format: "${nipRaw}".` });
    }

    const docNumberRaw = row[3];
    let documentType = "";
    if (typeof docNumberRaw === "string") {
      documentType = docNumberRaw.split("/")[0];
      if (!DOCUMENT_NUMBER_PATTERN.test(docNumberRaw)) {
        errors.push({
          sourceRowNumber,
          message: `Numer dokumentu (kolumna D) ma nieprawidłowy format: "${docNumberRaw}" (oczekiwano TYP/rrrr/mm/nnnn).`,
        });
      }
    } else if (!isBlank(docNumberRaw)) {
      errors.push({ sourceRowNumber, message: "Numer dokumentu (kolumna D) musi być tekstem." });
    }

    const amountRaw = row[4];
    if (typeof amountRaw === "number") {
      if (amountRaw === 0) {
        errors.push({ sourceRowNumber, message: "Wartość netto (kolumna E) nie może być równa zero." });
      } else if (amountRaw < 0 && documentType !== "FKS") {
        errors.push({
          sourceRowNumber,
          message: "Wartość netto (kolumna E) jest ujemna, ale dokument nie jest fakturą korygującą (FKS).",
        });
      }
    } else if (!isBlank(amountRaw)) {
      errors.push({ sourceRowNumber, message: "Wartość netto (kolumna E) musi być liczbą." });
    }

    if (documentType === "FKS") {
      for (const { index, letter } of FLAG_COLUMNS) {
        if (!isBlank(row[index])) {
          errors.push({
            sourceRowNumber,
            message: `Faktura korygująca (FKS) nie powinna mieć ustawionej flagi w kolumnie ${letter}.`,
          });
        }
      }
    } else {
      let setCount = 0;
      for (const { index, letter } of FLAG_COLUMNS) {
        const value = row[index];
        if (!isBlank(value)) {
          setCount++;
          if (value !== 1) {
            errors.push({
              sourceRowNumber,
              message: `Kolumna ${letter} zawiera nieprawidłową wartość flagi: "${value}" (dozwolona wyłącznie liczba 1).`,
            });
          }
        }
      }
      if (setCount === 0) {
        errors.push({ sourceRowNumber, message: "Brak ustawionej flagi w kolumnach F-I." });
      } else if (setCount > 1) {
        errors.push({ sourceRowNumber, message: "Więcej niż jedna flaga ustawiona w kolumnach F-I." });
      }
    }

    if (monthColumnCount > 0) {
      const monthCells = row.slice(FIXED_COLUMN_COUNT);
      let hasNonZeroMonth = false;
      for (const cell of monthCells) {
        if (typeof cell === "number") {
          if (cell !== 0) hasNonZeroMonth = true;
        } else if (!isBlank(cell)) {
          errors.push({ sourceRowNumber, message: `Nieprawidłowy format kwoty w kolumnie miesięcznej: "${cell}".` });
        }
      }
      if (!hasNonZeroMonth) {
        errors.push({
          sourceRowNumber,
          message: "Brak przychodu w jakimkolwiek miesiącu (wszystkie kolumny miesięczne są puste lub zerowe).",
        });
      }
    }
  });

  return errors;
}
