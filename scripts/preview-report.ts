/**
 * Skrypt pomocniczy do ręcznej weryfikacji silnika zestawień w trakcie budowy
 * Etapu 2 (SPEC.md III) - zanim powstanie właściwy ekran (Etap 3, zadanie 3.3).
 * Nie jest to produkcyjny kod zestawień - brak testów tego pliku. Tylko podgląd
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
import { singleFlagLetter } from "../src/lib/import/buildRevenueItemRow.ts";
import { parseDecimalToGrosze } from "../src/lib/reports/parseDecimalToGrosze.ts";
import { aggregateMonthlyRevenuePerClient } from "../src/lib/reports/aggregateMonthlyRevenuePerClient.ts";
import { sumByFlag } from "../src/lib/reports/sumByFlag.ts";
import { buildClientMonthlyRevenueReport } from "../src/lib/reports/buildClientMonthlyRevenueReport.ts";
import type { ItemMonthFact } from "../src/lib/reports/buildClientMonthlyRevenueReport.ts";
import { countBanksAndSkoks } from "../src/lib/reports/countBanksAndSkoks.ts";
import { buildExpiringContractsReport } from "../src/lib/reports/buildExpiringContractsReport.ts";
import { isWithinExpiringHorizon } from "../src/lib/reports/expiringReportHorizon.ts";
import { buildPackageStartReport } from "../src/lib/reports/buildPackageStartReport.ts";
import { isWithinPackageStartHorizon } from "../src/lib/reports/packageStartHorizon.ts";

interface MonthlyFlaggedFact {
  month: string;
  flag: "F" | "G" | "H" | "I" | null;
  amountGrosze: number;
}

interface Facts {
  salesFacts: MonthlyFlaggedFact[]; // zestawienia 2-6 + korekty (miesiąc SPRZEDAŻY)
  itemMonthFacts: ItemMonthFact[]; // zestawienia 1, 7-11, 12 (miesiąc KALENDARZOWY)
  clientNames: Map<string, string>;
  // Typ klienta istnieje wyłącznie w słowniku aplikacji (SPEC.md 16.b), nie w pliku -
  // null w trybie --file oznacza "niedostępne", nie "brak banków" (zestawienie 16).
  clientTypes: Map<string, string> | null;
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

  const salesFacts: MonthlyFlaggedFact[] = [];
  const itemMonthFacts: ItemMonthFact[] = [];
  const clientNames = new Map<string, string>();

  for (const row of rows) {
    const flag = singleFlagLetter(row.flags);
    clientNames.set(row.nip, row.clientName); // ostatnie wystąpienie wygrywa (SPEC.md V.35)

    salesFacts.push({ month: formatMonthDate(row.saleMonth), flag, amountGrosze: row.netAmountGrosze });

    row.monthlyAmountsGrosze.forEach((monthlyAmountGrosze, index) => {
      if (monthlyAmountGrosze === 0) return;
      itemMonthFacts.push({
        nip: row.nip,
        flag,
        documentNumber: row.documentNumber,
        invoiceNetAmountGrosze: row.netAmountGrosze,
        month: formatMonthDate(monthIndexToDate(index)),
        monthlyAmountGrosze,
      });
    });
  }

  return { salesFacts, itemMonthFacts, clientNames, clientTypes: null };
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
    .select("nip, flag, sale_month, document_number, net_amount, revenue_months(month, amount)")
    .eq("is_active", true);

  if (error) {
    throw new Error(`Błąd odczytu z bazy: ${error.message}`);
  }

  const salesFacts: MonthlyFlaggedFact[] = [];
  const itemMonthFacts: ItemMonthFact[] = [];
  const nips = new Set<string>();

  for (const item of data ?? []) {
    nips.add(item.nip);
    const invoiceNetAmountGrosze = parseDecimalToGrosze(item.net_amount);

    salesFacts.push({ month: item.sale_month, flag: item.flag, amountGrosze: invoiceNetAmountGrosze });

    for (const rm of item.revenue_months ?? []) {
      itemMonthFacts.push({
        nip: item.nip,
        flag: item.flag,
        documentNumber: item.document_number,
        invoiceNetAmountGrosze,
        month: rm.month,
        monthlyAmountGrosze: parseDecimalToGrosze(rm.amount),
      });
    }
  }

  const clientNames = new Map<string, string>();
  const clientTypes = new Map<string, string>();
  if (nips.size > 0) {
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("nip, name, type")
      .in("nip", Array.from(nips));
    if (clientsError) {
      throw new Error(`Błąd odczytu słownika klientów: ${clientsError.message}`);
    }
    for (const client of clients ?? []) {
      clientNames.set(client.nip, client.name);
      clientTypes.set(client.nip, client.type);
    }
  }

  return { salesFacts, itemMonthFacts, clientNames, clientTypes };
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

  const { salesFacts, itemMonthFacts, clientNames, clientTypes } = filePath
    ? factsFromFile(filePath)
    : await factsFromDatabase();
  const source = filePath ? `plik ${filePath} (baza nie była dotykana)` : "baza Supabase";

  console.log(`Zestawienia 1-16 (podgląd) - miesiąc ${targetMonth} - źródło: ${source}\n`);

  const paying = aggregateMonthlyRevenuePerClient(
    itemMonthFacts.map((f) => ({ nip: f.nip, month: f.month, amountGrosze: f.monthlyAmountGrosze }))
  ).filter((row) => row.month === targetMonth);
  console.log(`1. Liczba klientów, którzy zapłacili: ${paying.length}`);

  const salesBreakdown = sumByFlag(salesFacts.filter((f) => f.month === targetMonth));
  printBreakdown("2-6. Wartość sprzedaży w miesiącu", salesBreakdown);

  const revenueBreakdown = sumByFlag(
    itemMonthFacts.filter((f) => f.month === targetMonth).map((f) => ({ flag: f.flag, amountGrosze: f.monthlyAmountGrosze }))
  );
  printBreakdown("7-11. Wartość przychodów w miesiącu", revenueBreakdown);

  const report = buildClientMonthlyRevenueReport(itemMonthFacts, targetMonth).sort(
    (a, b) => b.revenueGrosze - a.revenueGrosze
  );
  console.log(`\n12. Lista klientów z przychodem > 0 (${report.length}):`);
  for (const row of report) {
    const name = clientNames.get(row.nip) ?? "(nieznana nazwa)";
    console.log(
      `${row.nip}\t${name}\tprzychód miesiąca: ${formatGrosze(row.revenueGrosze)}\tsuma faktur: ${formatGrosze(row.invoiceTotalGrosze)}\tdokumenty: ${row.documentNumbers.join(", ")}`
    );
  }

  if (clientTypes === null) {
    console.log(
      "\n16. (niedostępne w trybie --file - typ klienta jest wyłącznie w słowniku aplikacji, nie w pliku źródłowym)"
    );
  } else {
    const banksAndSkoks = countBanksAndSkoks(
      report.map((row) => row.nip),
      clientTypes
    );
    console.log(`\n16. Liczba banków/SKOK-ów wśród płacących klientów: ${banksAndSkoks}`);
  }

  const availableMonths = Array.from(new Set(itemMonthFacts.map((f) => f.month))).sort();
  if (!isWithinExpiringHorizon(availableMonths, targetMonth)) {
    console.log(
      `\n13. (niedostępne dla ${targetMonth} - reguła horyzontu 13.d wymaga widocznego miesiąca poprzedniego i następnego w danych; dostępne dla ${availableMonths[1]} – ${availableMonths[availableMonths.length - 2]})`
    );
  } else {
    const expiring = buildExpiringContractsReport(itemMonthFacts, targetMonth).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    console.log(`\n13. Klienci, których umowy wygasły w ${targetMonth} i dotychczas nie przedłużyli (${expiring.length}):`);
    for (const row of expiring) {
      const name = clientNames.get(row.nip) ?? "(nieznana nazwa)";
      console.log(
        `${row.nip}\t${name}\twartość do utraty (mies. poprzedni): ${formatGrosze(row.revenueGrosze)}\tsuma faktur: ${formatGrosze(row.invoiceTotalGrosze)}\tdokumenty: ${row.documentNumbers.join(", ")}`
      );
    }
  }

  if (!isWithinPackageStartHorizon(availableMonths, targetMonth)) {
    console.log(
      `\n14-15. (niedostępne dla ${targetMonth} - reguła horyzontu 14.c/15.c wymaga widocznego miesiąca następnego w danych; dostępne do ${availableMonths[availableMonths.length - 2]})`
    );
  } else {
    const newClients = buildPackageStartReport(itemMonthFacts, "F", targetMonth).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    console.log(`\n14. Nowi klienci, których pakiet zaczyna się w ${targetMonth} (${newClients.length}):`);
    for (const row of newClients) {
      const name = clientNames.get(row.nip) ?? "(nieznana nazwa)";
      console.log(
        `${row.nip}\t${name}\twartość (pierwszy pełny miesiąc): ${formatGrosze(row.revenueGrosze)}\tsuma faktur: ${formatGrosze(row.invoiceTotalGrosze)}\tdokumenty: ${row.documentNumbers.join(", ")}`
      );
    }

    const renewalStarts = buildPackageStartReport(itemMonthFacts, "G", targetMonth).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    console.log(`\n15. Przedłużenia zaczynające się w ${targetMonth} (${renewalStarts.length}):`);
    for (const row of renewalStarts) {
      const name = clientNames.get(row.nip) ?? "(nieznana nazwa)";
      console.log(
        `${row.nip}\t${name}\twartość (pierwszy pełny miesiąc): ${formatGrosze(row.revenueGrosze)}\tsuma faktur: ${formatGrosze(row.invoiceTotalGrosze)}\tdokumenty: ${row.documentNumbers.join(", ")}`
      );
    }
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
