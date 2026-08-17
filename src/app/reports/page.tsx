import Link from "next/link";
import { loadAvailableMonths, loadReportFacts } from "./data";
import { buildMonthlySummary } from "@/lib/reports/buildMonthlySummary";
import { buildClientMonthlyRevenueReport } from "@/lib/reports/buildClientMonthlyRevenueReport";
import { countBanksAndSkoks } from "@/lib/reports/countBanksAndSkoks";
import { formatGroszeAsDecimal } from "@/lib/import/formatGroszeAsDecimal";
import { MonthSelect } from "./MonthSelect";

export const dynamic = "force-dynamic";

function formatZl(grosze: number): string {
  return `${formatGroszeAsDecimal(grosze)} zł`;
}

function currentMonthDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function ReportsPage(props: PageProps<"/reports">) {
  const searchParams = await props.searchParams;
  const months = await loadAvailableMonths();

  if (months.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
        <div className="w-full max-w-3xl">
          <Link href="/" className="text-sm text-gray-600 hover:underline">
            ← Powrót do importu
          </Link>
        </div>
        <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-lg font-semibold text-gray-900">Zestawienia</h1>
          <p className="text-sm text-gray-500">Brak danych — zaimportuj plik sprzedażowy.</p>
        </div>
      </div>
    );
  }

  const requestedMonth = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const selectedMonth =
    requestedMonth && months.includes(requestedMonth)
      ? requestedMonth
      : months.includes(currentMonthDate())
        ? currentMonthDate()
        : months[months.length - 1];

  const { salesFacts, itemMonthFacts, clientNames, clientTypes } = await loadReportFacts();

  const summary = buildMonthlySummary(salesFacts, itemMonthFacts, selectedMonth);
  const clientReport = buildClientMonthlyRevenueReport(itemMonthFacts, selectedMonth).sort(
    (a, b) => b.revenueGrosze - a.revenueGrosze
  );
  const banksAndSkoks = countBanksAndSkoks(clientReport.map((row) => row.nip), clientTypes);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <div className="flex w-full max-w-3xl items-center justify-between">
        <Link href="/" className="text-sm text-gray-600 hover:underline">
          ← Powrót do importu
        </Link>
        <MonthSelect months={months} selected={selectedMonth} />
      </div>

      <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold text-gray-900">Zestawienia 1–11, 16</h1>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 font-medium">Zestawienie</th>
              <th className="py-2 font-medium">Wartość</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2">1. Liczba klientów, którzy zapłacili</td>
              <td className="py-2">{summary.payingClientsCount}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">2. Wartość sprzedaży — razem</td>
              <td className="py-2">{formatZl(summary.salesBreakdown.total)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">3. Wartość sprzedaży — klienci nowi (F)</td>
              <td className="py-2">{formatZl(summary.salesBreakdown.F)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">4. Wartość sprzedaży — klienci przedłużający (G)</td>
              <td className="py-2">{formatZl(summary.salesBreakdown.G)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">5. Wartość sprzedaży — dokupienia (H)</td>
              <td className="py-2">{formatZl(summary.salesBreakdown.H)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">6. Wartość sprzedaży — zakupy incydentalne (I)</td>
              <td className="py-2">{formatZl(summary.salesBreakdown.I)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-400">— w tym korekty</td>
              <td className="py-2 text-gray-400">{formatZl(summary.salesBreakdown.corrections)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">7. Wartość przychodów — razem</td>
              <td className="py-2">{formatZl(summary.revenueBreakdown.total)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">8. Wartość przychodów — klienci nowi (F)</td>
              <td className="py-2">{formatZl(summary.revenueBreakdown.F)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">9. Wartość przychodów — klienci przedłużający (G)</td>
              <td className="py-2">{formatZl(summary.revenueBreakdown.G)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">10. Wartość przychodów — dokupienia (H)</td>
              <td className="py-2">{formatZl(summary.revenueBreakdown.H)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2">11. Wartość przychodów — zakupy incydentalne (I)</td>
              <td className="py-2">{formatZl(summary.revenueBreakdown.I)}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-400">— w tym korekty</td>
              <td className="py-2 text-gray-400">{formatZl(summary.revenueBreakdown.corrections)}</td>
            </tr>
            <tr>
              <td className="py-2">16. Liczba banków / SKOK-ów wśród płacących</td>
              <td className="py-2">{banksAndSkoks}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          12. Klienci z przychodem w miesiącu ({clientReport.length})
        </h2>

        {clientReport.length === 0 ? (
          <p className="text-sm text-gray-500">Brak klientów z przychodem w tym miesiącu.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 font-medium">NIP</th>
                <th className="py-2 font-medium">Nazwa</th>
                <th className="py-2 font-medium">Przychód miesiąca</th>
                <th className="py-2 font-medium">Suma faktur</th>
                <th className="py-2 font-medium">Dokumenty</th>
              </tr>
            </thead>
            <tbody>
              {clientReport.map((row) => (
                <tr key={row.nip} className="border-b border-gray-100 align-top">
                  <td className="py-2">{row.nip}</td>
                  <td className="py-2">{clientNames.get(row.nip) ?? "(nieznana nazwa)"}</td>
                  <td className="py-2">{formatZl(row.revenueGrosze)}</td>
                  <td className="py-2">{formatZl(row.invoiceTotalGrosze)}</td>
                  <td className="py-2">{row.documentNumbers.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
