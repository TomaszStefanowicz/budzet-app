/**
 * Skrypt pomocniczy do ręcznej weryfikacji silnika zestawień w trakcie budowy
 * Etapu 2 (SPEC.md III) - zanim powstanie właściwy ekran (Etap 3, zadanie 3.3).
 * Nie jest to zestawienie 12 - brak numerów faktur, brak testów. Tylko podgląd
 * "na oko" do porównania z Excelem.
 *
 * Dwa tryby źródła danych:
 *   --month=rrrr-mm                          odczyt z bazy Supabase (dane demo/produkcyjne)
 *   --file=sciezka.xlsx --month=rrrr-mm       odczyt bezpośrednio z pliku .xlsx, BEZ dotykania bazy
 *
 * Tryb --file jest bezpieczny dla plików z prawdziwymi danymi (np. local-data/Sprzedaz.xlsx) -
 * nic nie jest zapisywane ani odczytywane z Supabase, tylko parsowanie lokalnego pliku.
 *
 * Użycie: node --env-file=.env.local scripts/preview-report.ts --month=2026-03
 *         node scripts/preview-report.ts --file=local-data/Sprzedaz.xlsx --month=2026-03
 */

import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { parseWorkbookBuffer } from "../src/lib/import/parseWorkbook.ts";
import { validateFileStructure } from "../src/lib/import/validateStructure.ts";
import { validateDocumentAndFlagRules } from "../src/lib/import/validateFlagRules.ts";
import { validateFlagContinuity } from "../src/lib/import/validateFlagContinuity.ts";
import { combineValidationErrors } from "../src/lib/import/combineValidationErrors.ts";
import { parseSalesRows, monthIndexToDate } from "../src/lib/import/parseSalesRows.ts";
import { formatMonthDate } from "../src/lib/import/formatMonthDate.ts";
import { parseDecimalToGrosze } from "../src/lib/reports/parseDecimalToGrosze.ts";
import { aggregateMonthlyRevenuePerClient } from "../src/lib/reports/aggregateMonthlyRevenuePerClient.ts";
import type { RevenueFact } from "../src/lib/reports/aggregateMonthlyRevenuePerClient.ts";

function parseMonthArg(): string {
  const arg = process.argv.find((a) => a.startsWith("--month="));
  if (!arg) {
    throw new Error("Podaj miesiąc: --month=rrrr-mm (np. --month=2026-03).");
  }
  const month = arg.split("=")[1];
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error(`Nieprawidłowy format miesiąca: "${month}" (oczekiwano rrrr-mm).`);
  }
  return `${month}-01`;
}

function parseFileArg(): string | null {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  return arg ? arg.split("=")[1] : null;
}

function factsFromFile(filePath: string): RevenueFact[] {
  const buffer = readFileSync(filePath);
  const rawRows = parseWorkbookBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));

  const errors = combineValidationErrors(
    validateFileStructure(rawRows),
    validateDocumentAndFlagRules(rawRows),
    validateFlagContinuity(rawRows)
  );
  if (errors.length > 0) {
    console.error(`Plik nie przechodzi walidacji (${errors.length} błędów):`);
    for (const e of errors.slice(0, 20)) {
      console.error(`  Wers ${e.sourceRowNumber}: ${e.message}`);
    }
    throw new Error("Przerwano - napraw plik źródłowy przed podglądem.");
  }

  const { rows } = parseSalesRows(rawRows);

  return rows.flatMap((row) =>
    row.monthlyAmountsGrosze
      .map((amountGrosze, index) => ({ amountGrosze, index }))
      .filter(({ amountGrosze }) => amountGrosze !== 0)
      .map(({ amountGrosze, index }) => ({
        nip: row.nip,
        month: formatMonthDate(monthIndexToDate(index)),
        amountGrosze,
      }))
  );
}

function formatGrosze(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")} zł`;
}

async function factsFromDatabase(): Promise<RevenueFact[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Brak zmiennych środowiskowych Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY).");
  }
  const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supabase
    .from("revenue_items")
    .select("nip, revenue_months(month, amount)")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Błąd odczytu z bazy: ${error.message}`);
  }

  return (data ?? []).flatMap((item) =>
    (item.revenue_months ?? []).map((rm) => ({
      nip: item.nip,
      month: rm.month,
      amountGrosze: parseDecimalToGrosze(rm.amount),
    }))
  );
}

async function main() {
  const targetMonth = parseMonthArg();
  const filePath = parseFileArg();

  const facts = filePath ? factsFromFile(filePath) : await factsFromDatabase();
  const source = filePath ? `plik ${filePath} (baza nie była dotykana)` : "baza Supabase";

  const aggregated = aggregateMonthlyRevenuePerClient(facts).filter((row) => row.month === targetMonth);
  aggregated.sort((a, b) => b.totalGrosze - a.totalGrosze);

  console.log(`Zestawienie 12 (podgląd) - miesiąc ${targetMonth} - źródło: ${source}`);
  console.log(`Liczba klientów z przychodem > 0: ${aggregated.length}\n`);
  for (const row of aggregated) {
    console.log(`${row.nip}\t${formatGrosze(row.totalGrosze)}`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
