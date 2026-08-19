export interface SourceItemFact {
  sourceRowNumber: number;
  nip: string;
  documentNumber: string;
  netAmountGrosze: number;
  flag: "F" | "G" | "H" | "I" | null;
  monthlyAmountsGrosze: Map<string, number>;
}

export interface SourceDataRow {
  lp: number;
  clientName: string;
  nip: string;
  documentNumber: string;
  netAmountGrosze: number;
  flag: "F" | "G" | "H" | "I" | null;
  monthlyAmountsGrosze: number[];
}

/**
 * Podgląd danych źródłowych ("Dane") - odtwarza układ arkusza importu
 * (SPEC.md II.2: Lp/Nazwa/NIP/Numer dokumentu/Wartość netto/F/G/H/I/miesiące)
 * z powrotem z pozycji rozliczeniowych w bazie. `revenue_months` przechowuje
 * tylko niezerowe miesiące (SPEC.md V.33) - tu każdy wers dostaje pełną listę
 * `months` z zerami tam, gdzie w bazie nie ma wpisu, żeby siatka odpowiadała
 * oryginalnemu arkuszowi.
 */
export function buildSourceDataRows(
  items: SourceItemFact[],
  clientNames: Map<string, string>,
  months: string[]
): SourceDataRow[] {
  return items
    .slice()
    .sort((a, b) => a.sourceRowNumber - b.sourceRowNumber)
    .map((item) => ({
      lp: item.sourceRowNumber,
      clientName: clientNames.get(item.nip) ?? "(nieznana nazwa)",
      nip: item.nip,
      documentNumber: item.documentNumber,
      netAmountGrosze: item.netAmountGrosze,
      flag: item.flag,
      monthlyAmountsGrosze: months.map((month) => item.monthlyAmountsGrosze.get(month) ?? 0),
    }));
}
