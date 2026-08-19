import { parseDecimalToGrosze } from "./parseDecimalToGrosze";
import type { FlagBreakdown } from "./sumByFlag";
import type { MonthlySummary } from "./buildMonthlySummary";
import type { ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport";

export interface ArchivedClientRow {
  nip: string;
  name: string | null;
  revenueZl: number;
  invoiceTotalZl: number;
  documentNumbers: string[];
}

export interface ArchivedBreakdown {
  total: number;
  F: number;
  G: number;
  H: number;
  I: number;
  corrections: number;
}

export interface ArchivedPayload {
  summary: {
    payingClientsCount: number;
    salesBreakdownZl: ArchivedBreakdown;
    revenueBreakdownZl: ArchivedBreakdown;
    /** Kształt sprzed decyzji V.45 - tylko liczba, bez listy klientów. */
    banksAndSkoks?: number;
  };
  clients: ArchivedClientRow[];
  /** Brak w migawkach zapisanych przed decyzją V.46. */
  banksAndSkoksClients?: ArchivedClientRow[];
  /** Brak, gdy miesiąc był poza horyzontem zestawienia 13 w chwili archiwizacji. */
  expiringClients?: ArchivedClientRow[];
  /** Brak, gdy miesiąc był poza horyzontem zestawień 14/15 w chwili archiwizacji. */
  newClients?: ArchivedClientRow[];
  renewalStarts?: ArchivedClientRow[];
}

/**
 * Odtwarza `ClientRevenueReportRow` (grosze) z archiwalnego wiersza (złotówki)
 * - odwrotność `toClientPayload` z `app/reports/actions.ts`.
 */
export function archivedRowToReportRow(row: ArchivedClientRow): ClientRevenueReportRow {
  return {
    nip: row.nip,
    revenueGrosze: parseDecimalToGrosze(row.revenueZl),
    invoiceTotalGrosze: parseDecimalToGrosze(row.invoiceTotalZl),
    documentNumbers: row.documentNumbers ?? [],
  };
}

/** Odtwarza `FlagBreakdown` (grosze) z archiwalnego rozbicia (złotówki). */
export function archivedBreakdownToGrosze(breakdown: ArchivedBreakdown): FlagBreakdown {
  return {
    total: parseDecimalToGrosze(breakdown.total),
    F: parseDecimalToGrosze(breakdown.F),
    G: parseDecimalToGrosze(breakdown.G),
    H: parseDecimalToGrosze(breakdown.H),
    I: parseDecimalToGrosze(breakdown.I),
    corrections: parseDecimalToGrosze(breakdown.corrections),
  };
}

export function archivedSummaryToMonthlySummary(payload: ArchivedPayload): MonthlySummary {
  return {
    payingClientsCount: payload.summary.payingClientsCount,
    salesBreakdown: archivedBreakdownToGrosze(payload.summary.salesBreakdownZl),
    revenueBreakdown: archivedBreakdownToGrosze(payload.summary.revenueBreakdownZl),
  };
}

/**
 * Buduje mapę NIP -> nazwa ze WSZYSTKICH sekcji migawki naraz - klienci z
 * zestawień 13-15 mogą mieć zerowy przychód w danym miesiącu (stąd nie ma
 * ich w `clients`, czyli zestawieniu 12), więc żadna pojedyncza sekcja nie
 * jest gwarantowanym nadzbiorem.
 */
export function archivedClientNames(payload: ArchivedPayload): Record<string, string> {
  const names: Record<string, string> = {};
  const allRows = [
    ...(payload.clients ?? []),
    ...(payload.banksAndSkoksClients ?? []),
    ...(payload.expiringClients ?? []),
    ...(payload.newClients ?? []),
    ...(payload.renewalStarts ?? []),
  ];
  for (const row of allRows) {
    if (row.name) names[row.nip] = row.name;
  }
  return names;
}
