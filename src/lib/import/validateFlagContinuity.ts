import type { StructuralValidationError } from "./validateStructure";

const FIXED_COLUMN_COUNT = 9; // A-I
const HORIZON_MONTHS = 12;

interface FlagEntry {
  sourceRowNumber: number;
  flag: "F" | "G";
  startIdx: number;
  endIdx: number;
}

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === "";
}

function monthSpan(row: unknown[]): { start: number; end: number } | null {
  let start = -1;
  let end = -1;
  for (let i = FIXED_COLUMN_COUNT; i < row.length; i++) {
    const cell = row[i];
    if (typeof cell === "number" && cell !== 0) {
      if (start === -1) start = i - FIXED_COLUMN_COUNT;
      end = i - FIXED_COLUMN_COUNT;
    }
  }
  return start === -1 ? null : { start, end };
}

/**
 * Waliduje spójność flag F/G z historią dostępu klienta per NIP (SPEC.md II.3.g).
 * Flaga F wymaga, żeby ewentualny poprzedni dostęp wygasł WIĘCEJ niż 12 miesięcy
 * przed rozpoczęciem rozliczeń tego wersu; flaga G - żeby wygasł co NAJWYŻEJ
 * 12 miesięcy przed. Reguła horyzontu (II.3.g.3) toleruje flagę G bez widocznej
 * historii, jeśli rozliczenia zaczynają się w pierwszych 12 miesiącach danych
 * (poprzedni dostęp mógł wygasnąć przed horyzontem, poza zasięgiem pliku).
 *
 * Flaga I jest celowo pomijana - z definicji (SPEC.md II.2) to zakup jednorazowy
 * niegenerujący stałego strumienia przychodów, niezwiązany z dostępem do
 * platformy (potwierdzone empirycznie: uwzględnienie jej w łańcuchu ciągłości
 * generuje rozbieżności względem danych referencyjnych, wykluczenie - zero).
 * Flaga H (dokupienie) też nie uczestniczy - nie tworzy ani nie resetuje
 * bazowego dostępu, jest dodatkiem do istniejącego pakietu.
 */
export function validateFlagContinuity(rawRows: unknown[][]): StructuralValidationError[] {
  const errors: StructuralValidationError[] = [];
  const dataRows = rawRows.slice(1);

  const byNip = new Map<string, FlagEntry[]>();

  dataRows.forEach((row, i) => {
    const sourceRowNumber = i + 2;

    const nipRaw = row[2];
    if (isBlank(nipRaw)) return;
    const nip = String(nipRaw);

    const isF = !isBlank(row[5]);
    const isG = !isBlank(row[6]);
    const isH = !isBlank(row[7]);
    const isI = !isBlank(row[8]);
    if (isF === isG) return; // 0 lub >1 flaga w F/G - zgłoszone już przez validateFileStructure
    if (isH || isI) return; // więcej niż jedna flaga ustawiona - zgłoszone już przez validateFileStructure

    const span = monthSpan(row);
    if (!span) return; // brak przychodu w żadnym miesiącu - zgłoszone już przez validateFileStructure

    const entry: FlagEntry = { sourceRowNumber, flag: isF ? "F" : "G", startIdx: span.start, endIdx: span.end };
    if (!byNip.has(nip)) byNip.set(nip, []);
    byNip.get(nip)!.push(entry);
  });

  for (const entries of byNip.values()) {
    entries.sort((a, b) => a.startIdx - b.startIdx);

    entries.forEach((entry, idx) => {
      if (idx === 0) {
        if (entry.flag === "G" && entry.startIdx >= HORIZON_MONTHS) {
          errors.push({
            sourceRowNumber: entry.sourceRowNumber,
            message:
              "Flaga G bez widocznej wcześniejszej historii dostępu dla tego NIP, poza oknem 12 miesięcy od początku danych (SPEC.md II.3.g).",
          });
        }
        return;
      }

      const previousEnd = entries[idx - 1].endIdx;
      const gapMonths = entry.startIdx - previousEnd;

      if (entry.flag === "F" && gapMonths <= HORIZON_MONTHS) {
        errors.push({
          sourceRowNumber: entry.sourceRowNumber,
          message: `Flaga F niepoprawna: poprzedni dostęp tego NIP wygasł ${gapMonths} mies. przed tym wersem (≤12) — powinna być flaga G (SPEC.md II.3.g).`,
        });
      }
      if (entry.flag === "G" && gapMonths > HORIZON_MONTHS) {
        errors.push({
          sourceRowNumber: entry.sourceRowNumber,
          message: `Flaga G niepoprawna: poprzedni dostęp tego NIP wygasł ${gapMonths} mies. przed tym wersem (>12) — powinna być flaga F (SPEC.md II.3.g).`,
        });
      }
    });
  }

  return errors;
}
