/**
 * Skrypt pomocniczy do ręcznej weryfikacji silnika zestawień w trakcie budowy
 * Etapu 2 (SPEC.md III) - zanim powstanie właściwy ekran (Etap 3, zadanie 3.3).
 * Nie jest to produkcyjny kod zestawień - brak numerów faktur (12), brak testów
 * tego pliku. Tylko podgląd "na oko" do porównania z Excelem.
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
import { singleFlagLetter } from "../src/lib/import/buildRevenueItemRow.ts";
import { parseDecimalToGrosze } from "../src/lib/reports/parseDecimalToGrosze.ts";
import { aggregateMonthlyRevenuePerClient } from "../src/lib/reports/aggregateMonthlyRevenuePerClient.ts";
import type { RevenueFact } from "../src/lib/reports/aggregateMonthlyRevenuePerClient.ts";
import { sumByFlag } from "../src/lib/reports/sumByFlag.ts";
import type { FlaggedFact } from "../src/lib/reports/sumByFlag.ts";

interface MonthlyFlaggedFact extends FlaggedFact {
  month: string;
}

interface Facts {
  clientFacts: RevenueFact[]; // zestawienie 1, 12 (nip, miesiąc kalendarzowy, kwota)
  salesFacts: MonthlyFlaggedFact[]; // zestawienia 2-6 + korekty (miesiąc SPRZEDAŻY)
  revenueFacts: MonthlyFlaggedFact[]; // zestawienia 7-11 + korekty (miesiąc KALENDARZOWY)
}

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

function factsFromFile(filePath: string): Facts {
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

  const clientFacts: RevenueFact[] = [];
  const salesFacts: MonthlyFlaggedFact[] = [];
  const revenueFacts: MonthlyFlaggedFact[] = [];

  for (const row of rows) {
    const flag = singleFlagLetter(row.flags);

    salesFacts.push({ month: formatMonthDate(row.saleMonth), flag, amountGrosze: row.netAmountGrosze });

    row.monthlyAmountsGrosze.forEach((amountGrosze, index) => {
      if (amountGrosze === 0) return;
      const month = formatMonthDate(monthIndexToDate(index));
      clientFacts.push({ nip: row.nip, month, amountGrosze });
      revenueFacts.push({ month, flag, amountGrosze });
    });
  }

  return { clientFacts, salesFacts, revenueFacts };
}

async function factsFromDatabase(): Promise<Facts> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Brak zmiennych środowiskowych Supabase (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY).");
  }
  const supabase = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supabase
    .from("revenue_items")
    .select("nip, flag, sale_month, net_amount, revenue_months(month, amount)")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Błąd odczytu z bazy: ${error.message}`);
  }

  const clientFacts: RevenueFact[] = [];
  const salesFacts: MonthlyFlaggedFact[] = [];
  const revenueFacts: MonthlyFlaggedFact[] = [];

  for (const item of data ?? []) {
    salesFacts.push({
      month: item.sale_month,
      flag: item.flag,
      amountGrosze: parseDecimalToGrosze(item.net_amount),
    });
    for (const rm of item.revenue_months ?? []) {
      const amountGrosze = parseDecimalToGrosze(rm.amount);
      clientFacts.push({ nip: item.nip, month: rm.month, amountGrosze });
      revenueFacts.push({ month: rm.month, flag: item.flag, amountGrosze });
    }
  }

  return { clientFacts, salesFacts, revenueFacts };
}

function formatGrosze(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")} zł`;
}

function printBreakdown(label: string, breakdown: ReturnType<typeof sumByFlag>) {
  console.log(
    `${label}: total ${formatGrosze(breakdown.total)} | F ${formatGrosze(breakdown.F)} | G ${formatGrosze(breakdown.G)} | H ${formatGrosze(breakdown.H)} | I ${formatGrosze(breakdown.I)} | korekty ${formatGrosze(breakdown.corrections)}`
  );
}

async function main() {
  const targetMonth = parseMonthArg();
  const filePath = parseFileArg();

  const { clientFacts, salesFacts, revenueFacts } = filePath ? factsFromFile(filePath) : await factsFromDatabase();
  const source = filePath ? `plik ${filePath} (baza nie była dotykana)` : "baza Supabase";

  console.log(`Zestawienia 1-12 (podgląd) - miesiąc ${targetMonth} - źródło: ${source}\n`);

  const paying = aggregateMonthlyRevenuePerClient(clientFacts).filter((row) => row.month === targetMonth);
  console.log(`1. Liczba klientów, którzy zapłacili: ${paying.length}`);

  const salesBreakdown = sumByFlag(salesFacts.filter((f) => f.month === targetMonth));
  printBreakdown("2-6. Wartość sprzedaży w miesiącu", salesBreakdown);

  const revenueBreakdown = sumByFlag(revenueFacts.filter((f) => f.month === targetMonth));
  printBreakdown("7-11. Wartość przychodów w miesiącu", revenueBreakdown);

  console.log(`\n12. Lista klientów z przychodem > 0 (${paying.length}):`);
  paying
    .sort((a, b) => b.totalGrosze - a.totalGrosze)
    .forEach((row) => console.log(`${row.nip}\t${formatGrosze(row.totalGrosze)}`));
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
