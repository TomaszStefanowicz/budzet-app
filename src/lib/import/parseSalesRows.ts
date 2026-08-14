const FIXED_COLUMN_COUNT = 9; // A-I: lp, nazwa, NIP, numer dokumentu, wartość netto, F, G, H, I
const MONTH_COLUMNS_START = { year: 2024, month: 1 }; // kolumna J (SPEC.md II.2, II.4)

export interface ParsedSalesRow {
  sourceRowNumber: number; // numer wersu w pliku źródłowym (wers 1 = nagłówek, dane od wersu 2)
  clientName: string;
  nip: string;
  documentNumber: string;
  documentType: string;
  netAmountGrosze: number;
  flags: { F: boolean; G: boolean; H: boolean; I: boolean };
  monthlyAmountsGrosze: number[]; // indeks 0 = styczeń 2024
}

export interface MonthRange {
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
}

export interface ParsedSalesFile {
  rows: ParsedSalesRow[];
  monthRange: MonthRange | null; // null, gdy plik nie zawiera żadnych kolumn miesięcznych
}

function toGrosze(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function monthIndexToDate(index: number): { year: number; month: number } {
  const totalMonths = (MONTH_COLUMNS_START.year * 12 + (MONTH_COLUMNS_START.month - 1)) + index;
  return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1 };
}

/**
 * Zamienia surowe wersy arkusza (patrz parseWorkbookBuffer) na ustrukturyzowane
 * dane wejściowe do dalszej walidacji. Nie sprawdza poprawności reguł
 * biznesowych (typy dokumentów, flagi, format numeru dokumentu) - to zadanie
 * kolejnych warstw walidacji (PLAN.md 1.2-1.4). Zakłada dokładnie jeden wiersz
 * nagłówkowy (SPEC.md V.23).
 */
export function parseSalesRows(rawRows: unknown[][]): ParsedSalesFile {
  const dataRows = rawRows.slice(1); // pomijamy jedyny wiersz nagłówkowy (SPEC.md V.23)
  const headerWidth = rawRows[0]?.length ?? 0;
  const monthColumnCount = Math.max(0, headerWidth - FIXED_COLUMN_COUNT);

  const monthRange: MonthRange | null =
    monthColumnCount === 0
      ? null
      : (() => {
          const from = monthIndexToDate(0);
          const to = monthIndexToDate(monthColumnCount - 1);
          return { fromYear: from.year, fromMonth: from.month, toYear: to.year, toMonth: to.month };
        })();

  const rows: ParsedSalesRow[] = dataRows.map((row, i) => {
    const monthlyAmountsGrosze = Array.from({ length: monthColumnCount }, (_, m) =>
      toGrosze(row[FIXED_COLUMN_COUNT + m])
    );

    return {
      sourceRowNumber: i + 2, // +1 za nagłówek, +1 bo wersy liczone od 1
      clientName: toText(row[1]),
      nip: toText(row[2]),
      documentNumber: toText(row[3]),
      documentType: toText(row[3]).split("/")[0],
      netAmountGrosze: toGrosze(row[4]),
      flags: {
        F: row[5] != null,
        G: row[6] != null,
        H: row[7] != null,
        I: row[8] != null,
      },
      monthlyAmountsGrosze,
    };
  });

  return { rows, monthRange };
}
