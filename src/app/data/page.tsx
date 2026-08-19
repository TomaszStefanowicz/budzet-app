import { loadAvailableMonths } from "@/app/reports/data";
import { formatZl } from "@/app/reports/formatZl";
import { buildSourceDataRows, sumSourceDataColumns } from "@/lib/data-preview/buildSourceDataRows";
import { Nav } from "../components/Nav";
import { loadSourceDataFacts } from "./data";

export const dynamic = "force-dynamic";

function monthLabel(month: string): string {
  const [year, monthNum] = month.slice(0, 7).split("-");
  return `${year}/${monthNum}`;
}

const FLAG_COLUMNS: { letter: "F" | "G" | "H" | "I"; label: string }[] = [
  { letter: "F", label: "N" },
  { letter: "G", label: "P" },
  { letter: "H", label: "D" },
  { letter: "I", label: "I" },
];

export default async function DataPage() {
  const months = await loadAvailableMonths();

  if (months.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
        <div className="w-full max-w-6xl">
          <Nav active="data" />
        </div>
        <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-gray-900">Dane</h1>
          <p className="text-sm text-gray-500">Brak danych — zaimportuj plik sprzedażowy.</p>
        </div>
      </div>
    );
  }

  const { items, clientNames } = await loadSourceDataFacts();
  const rows = buildSourceDataRows(items, clientNames, months);
  const totals = sumSourceDataColumns(rows, months.length);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <div className="w-full max-w-6xl">
        <Nav active="data" />
      </div>

      <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Dane źródłowe</h1>
        <p className="mb-4 text-sm text-gray-500">
          Podgląd aktywnych pozycji z ostatniego udanego importu ({rows.length} {rows.length === 1 ? "wers" : "wersów"}).
        </p>

        <div className="max-h-[70vh] overflow-auto">
          <table className="text-left text-xs">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-gray-200 bg-white text-gray-500">
                <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Lp</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Nazwa klienta</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">NIP</th>
                <th className="whitespace-nowrap px-2 py-2 font-medium">Numer dokumentu</th>
                <th className="whitespace-nowrap px-2 py-2 text-right font-medium">Wartość netto</th>
                {FLAG_COLUMNS.map(({ letter, label }) => (
                  <th key={letter} className="whitespace-nowrap px-2 py-2 text-center font-medium">
                    {label}
                  </th>
                ))}
                {months.map((month) => (
                  <th key={month} className="whitespace-nowrap px-2 py-2 text-right font-medium">
                    {monthLabel(month)}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                <td className="whitespace-nowrap px-2 py-1" colSpan={4}>
                  Suma:
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right font-medium">{formatZl(totals.netAmountGrosze)}</td>
                {FLAG_COLUMNS.map(({ letter }) => (
                  <td key={letter} className="whitespace-nowrap px-2 py-1" />
                ))}
                {totals.monthlyTotalsGrosze.map((amountGrosze, index) => (
                  <td key={months[index]} className="whitespace-nowrap px-2 py-1 text-right font-medium">
                    {amountGrosze === 0 ? "" : formatZl(amountGrosze)}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.lp}-${row.nip}`} className="border-b border-gray-100 even:bg-gray-50">
                  <td className="whitespace-nowrap px-2 py-1 text-right">{row.lp}</td>
                  <td className="max-w-[180px] truncate px-2 py-1" title={row.clientName}>
                    {row.clientName}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">{row.nip}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.documentNumber}</td>
                  <td className="whitespace-nowrap px-2 py-1 text-right">{formatZl(row.netAmountGrosze)}</td>
                  {FLAG_COLUMNS.map(({ letter }) => (
                    <td key={letter} className="whitespace-nowrap px-2 py-1 text-center">
                      {row.flag === letter ? "1" : ""}
                    </td>
                  ))}
                  {row.monthlyAmountsGrosze.map((amountGrosze, index) => (
                    <td key={months[index]} className="whitespace-nowrap px-2 py-1 text-right">
                      {amountGrosze === 0 ? "" : formatZl(amountGrosze)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
