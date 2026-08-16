/**
 * Skrypt pomocniczy do ręcznej weryfikacji silnika zestawień w trakcie budowy
 * Etapu 2 (SPEC.md III) - zanim powstanie właściwy ekran (Etap 3, zadanie 3.3).
 * Nie jest to zestawienie 12 - brak numerów faktur, brak testów. Tylko podgląd
 * "na oko" do porównania z Excelem.
 *
 * Użycie: node --env-file=.env.local scripts/preview-report.ts --month=2026-03
 */

import { createClient } from "@supabase/supabase-js";
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

function formatGrosze(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  return `${sign}${Math.trunc(abs / 100)}.${String(abs % 100).padStart(2, "0")} zł`;
}

async function main() {
  const targetMonth = parseMonthArg();

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

  const facts: RevenueFact[] = (data ?? []).flatMap((item) =>
    (item.revenue_months ?? []).map((rm) => ({
      nip: item.nip,
      month: rm.month,
      amountGrosze: parseDecimalToGrosze(rm.amount),
    }))
  );

  const aggregated = aggregateMonthlyRevenuePerClient(facts).filter((row) => row.month === targetMonth);
  aggregated.sort((a, b) => b.totalGrosze - a.totalGrosze);

  console.log(`Zestawienie 12 (podgląd) - miesiąc ${targetMonth}`);
  console.log(`Liczba klientów z przychodem > 0: ${aggregated.length}\n`);
  for (const row of aggregated) {
    console.log(`${row.nip}\t${formatGrosze(row.totalGrosze)}`);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
