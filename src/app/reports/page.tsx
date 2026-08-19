import { loadAvailableMonths, loadReportFacts } from "./data";
import { buildMonthlySummary } from "@/lib/reports/buildMonthlySummary";
import { buildClientMonthlyRevenueReport } from "@/lib/reports/buildClientMonthlyRevenueReport";
import { buildExpiringContractsReport } from "@/lib/reports/buildExpiringContractsReport";
import { isWithinExpiringHorizon } from "@/lib/reports/expiringReportHorizon";
import { buildPackageStartReport } from "@/lib/reports/buildPackageStartReport";
import { isWithinPackageStartHorizon } from "@/lib/reports/packageStartHorizon";
import { countBanksAndSkoks } from "@/lib/reports/countBanksAndSkoks";
import { MonthSelect } from "./MonthSelect";
import { ArchiveButton } from "./ArchiveButton";
import { ClientReportTable } from "./ClientReportTable";
import { ReportSection } from "./ReportSection";
import { Nav } from "../components/Nav";
import { formatZl } from "./formatZl";

export const dynamic = "force-dynamic";

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
        <div className="w-full max-w-6xl">
          <Nav active="reports" />
        </div>
        <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-gray-900">Zestawienia</h1>
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

  const { salesFacts, itemMonthFacts, clientNames: clientNamesMap, clientTypes } = await loadReportFacts();
  const clientNames = Object.fromEntries(clientNamesMap);

  const summary = buildMonthlySummary(salesFacts, itemMonthFacts, selectedMonth);
  const clientReport = buildClientMonthlyRevenueReport(itemMonthFacts, selectedMonth).sort(
    (a, b) => b.revenueGrosze - a.revenueGrosze
  );
  const banksAndSkoks = countBanksAndSkoks(clientReport.map((row) => row.nip), clientTypes);

  const expiringEligible = isWithinExpiringHorizon(months, selectedMonth);
  const expiringReport = expiringEligible
    ? buildExpiringContractsReport(itemMonthFacts, selectedMonth).sort((a, b) => b.revenueGrosze - a.revenueGrosze)
    : [];

  const startEligible = isWithinPackageStartHorizon(months, selectedMonth);
  const newClientsReport = startEligible
    ? buildPackageStartReport(itemMonthFacts, "F", selectedMonth).sort((a, b) => b.revenueGrosze - a.revenueGrosze)
    : [];
  const renewalStartsReport = startEligible
    ? buildPackageStartReport(itemMonthFacts, "G", selectedMonth).sort((a, b) => b.revenueGrosze - a.revenueGrosze)
    : [];

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <div className="flex w-full max-w-6xl flex-col gap-3">
        <Nav active="reports" />
        <div className="flex items-center justify-end gap-3">
          <a
            href={`/api/reports/export?month=${selectedMonth}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Eksportuj do .xlsx
          </a>
          <ArchiveButton month={selectedMonth} />
          <MonthSelect months={months} selected={selectedMonth} />
        </div>
      </div>

      <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="mb-4 text-xl font-bold text-gray-900">Zestawienia 1–11, 16</h1>

        <table className="w-full table-fixed text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="py-2 font-medium">Zestawienie</th>
              <th className="w-36 px-2 py-2 text-right font-medium">Wartość</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">1. Liczba klientów, którzy zapłacili</td>
              <td className="py-2 px-2 text-right">{summary.payingClientsCount}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">2. Wartość sprzedaży — razem</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.salesBreakdown.total)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">3. Wartość sprzedaży — klienci nowi (F)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.salesBreakdown.F)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">4. Wartość sprzedaży — klienci przedłużający (G)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.salesBreakdown.G)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">5. Wartość sprzedaży — dokupienia (H)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.salesBreakdown.H)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">6. Wartość sprzedaży — zakupy incydentalne (I)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.salesBreakdown.I)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2 text-gray-400">— w tym korekty</td>
              <td className="py-2 px-2 text-right text-gray-400">{formatZl(summary.salesBreakdown.corrections)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">7. Wartość przychodów — razem</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.revenueBreakdown.total)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">8. Wartość przychodów — klienci nowi (F)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.revenueBreakdown.F)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">9. Wartość przychodów — klienci przedłużający (G)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.revenueBreakdown.G)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">10. Wartość przychodów — dokupienia (H)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.revenueBreakdown.H)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2">11. Wartość przychodów — zakupy incydentalne (I)</td>
              <td className="py-2 px-2 text-right">{formatZl(summary.revenueBreakdown.I)}</td>
            </tr>
            <tr className="border-b border-gray-100 even:bg-gray-50">
              <td className="py-2 text-gray-400">— w tym korekty</td>
              <td className="py-2 px-2 text-right text-gray-400">{formatZl(summary.revenueBreakdown.corrections)}</td>
            </tr>
            <tr className="even:bg-gray-50">
              <td className="py-2">16. Liczba banków / SKOK-ów wśród płacących</td>
              <td className="py-2 px-2 text-right">{banksAndSkoks}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">12. Klienci z przychodem w miesiącu</h2>
        <ClientReportTable
          rows={clientReport}
          clientNames={clientNames}
          revenueLabel="Przychód miesiąca"
          emptyMessage="Brak klientów z przychodem w tym miesiącu."
        />
      </div>

      <ReportSection
        title="13. Klienci, których umowy wygasły w tym miesiącu i dotychczas nie przedłużyli"
        eligible={expiringEligible}
        rows={expiringReport}
        clientNames={clientNames}
        revenueLabel="Wartość do utraty (miesiąc poprzedni)"
        emptyMessage="Brak klientów, których umowy wygasły w tym miesiącu i dotychczas nie przedłużyli."
        unavailableMessage={
          months.length >= 3
            ? `Niedostępne dla tego miesiąca — zestawienie wymaga widocznego miesiąca poprzedniego i następnego w danych (dostępne dla ${months[1]} – ${months[months.length - 2]}).`
            : "Niedostępne — zestawienie wymaga co najmniej 3 miesięcy danych."
        }
      />

      <ReportSection
        title="14. Nowi klienci, których pakiet zaczyna się w tym miesiącu"
        eligible={startEligible}
        rows={newClientsReport}
        clientNames={clientNames}
        revenueLabel="Wartość (pierwszy pełny miesiąc)"
        emptyMessage="Brak nowych klientów zaczynających w tym miesiącu."
        unavailableMessage={
          months.length >= 2
            ? `Niedostępne dla tego miesiąca — zestawienie wymaga widocznego miesiąca następnego w danych (dostępne do ${months[months.length - 2]}).`
            : "Niedostępne — zestawienie wymaga co najmniej 2 miesięcy danych."
        }
      />

      <ReportSection
        title="15. Klienci przedłużający, których przedłużenie zaczyna się w tym miesiącu"
        eligible={startEligible}
        rows={renewalStartsReport}
        clientNames={clientNames}
        revenueLabel="Wartość (pierwszy pełny miesiąc)"
        emptyMessage="Brak przedłużeń zaczynających się w tym miesiącu."
        unavailableMessage={
          months.length >= 2
            ? `Niedostępne dla tego miesiąca — zestawienie wymaga widocznego miesiąca następnego w danych (dostępne do ${months[months.length - 2]}).`
            : "Niedostępne — zestawienie wymaga co najmniej 2 miesięcy danych."
        }
      />
    </div>
  );
}
