import { ClientReportTable } from "./ClientReportTable";
import type { ClientRevenueReportRow } from "@/lib/reports/buildClientMonthlyRevenueReport";

export function ReportSection({
  title,
  eligible,
  rows,
  clientNames,
  revenueLabel,
  emptyMessage,
  unavailableMessage,
}: {
  title: string;
  eligible: boolean;
  rows: ClientRevenueReportRow[];
  clientNames: Map<string, string>;
  revenueLabel: string;
  emptyMessage: string;
  unavailableMessage: string;
}) {
  return (
    <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        {title} {eligible ? `(${rows.length})` : ""}
      </h2>
      {eligible ? (
        <ClientReportTable
          rows={rows}
          clientNames={clientNames}
          revenueLabel={revenueLabel}
          emptyMessage={emptyMessage}
        />
      ) : (
        <p className="text-sm text-gray-500">{unavailableMessage}</p>
      )}
    </div>
  );
}
