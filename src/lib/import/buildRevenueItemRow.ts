import type { ParsedSalesRow } from "./parseSalesRows";
import { formatMonthDate } from "./formatMonthDate";
import { formatGroszeAsDecimal } from "./formatGroszeAsDecimal";

export interface RevenueItemRow {
  import_id: number;
  nip: string;
  document_number: string;
  document_type: string;
  sale_month: string;
  net_amount: string;
  flag: "F" | "G" | "H" | "I" | null;
  source_row_number: number;
}

function singleFlagLetter(flags: ParsedSalesRow["flags"]): "F" | "G" | "H" | "I" | null {
  if (flags.F) return "F";
  if (flags.G) return "G";
  if (flags.H) return "H";
  if (flags.I) return "I";
  return null; // wyłącznie FKS (SPEC.md II.3.a) - wymuszone przez walidację przed wywołaniem tego parsera
}

/**
 * Buduje wers gotowy do insertu do revenue_items (SPEC.md IV.5, zadanie 1.6d).
 * Zakłada dane już zwalidowane (validateFileStructure, validateFlagRules) -
 * dokładnie jedna flaga albo żadna dla FKS.
 */
export function buildRevenueItemRow(row: ParsedSalesRow, importId: number): RevenueItemRow {
  return {
    import_id: importId,
    nip: row.nip,
    document_number: row.documentNumber,
    document_type: row.documentType,
    sale_month: formatMonthDate(row.saleMonth),
    net_amount: formatGroszeAsDecimal(row.netAmountGrosze),
    flag: singleFlagLetter(row.flags),
    source_row_number: row.sourceRowNumber,
  };
}
