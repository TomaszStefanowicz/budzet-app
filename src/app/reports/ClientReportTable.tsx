import { formatGroszeAsDecimal } from "@/lib/import/formatGroszeAsDecimal";
import type { ClientRevenueReportRow } from "@/lib/reports/buildClientMonthlyRevenueReport";

function formatZl(grosze: number): string {
  return `${formatGroszeAsDecimal(grosze)} zł`;
}

export function ClientReportTable({
  rows,
  clientNames,
  revenueLabel,
  emptyMessage,
}: {
  rows: ClientRevenueReportRow[];
  clientNames: Map<string, string>;
  revenueLabel: string;
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-gray-500">
          <th className="py-2 font-medium">NIP</th>
          <th className="py-2 font-medium">Nazwa</th>
          <th className="py-2 font-medium">{revenueLabel}</th>
          <th className="py-2 font-medium">Suma faktur</th>
          <th className="py-2 font-medium">Dokumenty</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
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
  );
}
