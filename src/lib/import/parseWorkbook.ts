import * as XLSX from "xlsx";

/**
 * Odczytuje bufor pliku .xlsx i zwraca surowe wersy arkusza jako tablicę tablic,
 * każdy wers wyrównany do pełnej szerokości arkusza (brakujące komórki na końcu
 * wersu jako null - SPEC.md II.4: puste komórki w kolumnach miesięcy = 0).
 *
 * Sama detekcja i interpretacja kolumn to zadanie parseSalesRows - ta funkcja
 * tylko dekoduje format pliku, bez żadnej logiki biznesowej.
 */
export function parseWorkbookBuffer(buffer: ArrayBuffer): unknown[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet || !sheet["!ref"]) return [];

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const width = range.e.c - range.s.c + 1;

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });

  return rows.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push(null);
    return padded;
  });
}
