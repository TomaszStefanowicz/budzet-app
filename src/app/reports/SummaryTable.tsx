import type { MonthlySummary } from "@/lib/reports/buildMonthlySummary";
import { formatZl, formatZlPlain } from "./formatZl";
import { CopyTableButton } from "./CopyTableButton";

export function SummaryTable({ summary }: { summary: MonthlySummary }) {
  const copyRows: (string | number)[][] = [
    ["Zestawienie", "Wartość"],
    ["1. Liczba klientów, którzy zapłacili", summary.payingClientsCount],
    ["2. Wartość sprzedaży — razem", formatZlPlain(summary.salesBreakdown.total)],
    ["3. Wartość sprzedaży — klienci nowi (F)", formatZlPlain(summary.salesBreakdown.F)],
    ["4. Wartość sprzedaży — klienci przedłużający (G)", formatZlPlain(summary.salesBreakdown.G)],
    ["5. Wartość sprzedaży — dokupienia (H)", formatZlPlain(summary.salesBreakdown.H)],
    ["6. Wartość sprzedaży — zakupy incydentalne (I)", formatZlPlain(summary.salesBreakdown.I)],
    ["— w tym korekty (sprzedaż)", formatZlPlain(summary.salesBreakdown.corrections)],
    ["7. Wartość przychodów — razem", formatZlPlain(summary.revenueBreakdown.total)],
    ["8. Wartość przychodów — klienci nowi (F)", formatZlPlain(summary.revenueBreakdown.F)],
    ["9. Wartość przychodów — klienci przedłużający (G)", formatZlPlain(summary.revenueBreakdown.G)],
    ["10. Wartość przychodów — dokupienia (H)", formatZlPlain(summary.revenueBreakdown.H)],
    ["11. Wartość przychodów — zakupy incydentalne (I)", formatZlPlain(summary.revenueBreakdown.I)],
    ["— w tym korekty (przychody)", formatZlPlain(summary.revenueBreakdown.corrections)],
  ];

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <CopyTableButton rows={copyRows} />
      </div>
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
        <tr className="even:bg-gray-50">
          <td className="py-2 text-gray-400">— w tym korekty</td>
          <td className="py-2 px-2 text-right text-gray-400">{formatZl(summary.revenueBreakdown.corrections)}</td>
        </tr>
      </tbody>
      </table>
    </div>
  );
}
