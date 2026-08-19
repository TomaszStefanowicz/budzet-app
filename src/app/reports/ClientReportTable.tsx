"use client";

import { useMemo, useState } from "react";
import { formatGroszeAsDecimal } from "@/lib/import/formatGroszeAsDecimal";
import type { ClientRevenueReportRow } from "@/lib/reports/buildClientMonthlyRevenueReport";

function formatZl(grosze: number): string {
  return `${formatGroszeAsDecimal(grosze)} zł`;
}

type SortColumn = "nip" | "name" | "revenue" | "invoiceTotal";
type SortDirection = "asc" | "desc";

function DocumentsCell({ documentNumbers }: { documentNumbers: string[] }) {
  if (documentNumbers.length === 0) return <span className="text-gray-400">—</span>;
  if (documentNumbers.length === 1) return <>{documentNumbers[0]}</>;

  return (
    <details>
      <summary className="cursor-pointer text-gray-700 select-none">{documentNumbers.length} dokumentów</summary>
      <div className="mt-1 text-gray-600">{documentNumbers.join(", ")}</div>
    </details>
  );
}

export function ClientReportTable({
  rows,
  clientNames,
  revenueLabel,
  emptyMessage,
}: {
  rows: ClientRevenueReportRow[];
  clientNames: Record<string, string>;
  revenueLabel: string;
  emptyMessage: string;
}) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = term
      ? rows.filter(
          (row) =>
            row.nip.toLowerCase().includes(term) || (clientNames[row.nip] ?? "").toLowerCase().includes(term)
        )
      : rows;

    if (!sortColumn) return base;

    const sorted = [...base].sort((a, b) => {
      let cmp = 0;
      if (sortColumn === "nip") cmp = a.nip.localeCompare(b.nip);
      else if (sortColumn === "name")
        cmp = (clientNames[a.nip] ?? "").localeCompare(clientNames[b.nip] ?? "", "pl");
      else if (sortColumn === "revenue") cmp = a.revenueGrosze - b.revenueGrosze;
      else if (sortColumn === "invoiceTotal") cmp = a.invoiceTotalGrosze - b.invoiceTotalGrosze;
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, clientNames, search, sortColumn, sortDirection]);

  function toggleSort(column: SortColumn) {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDirection("asc");
      return;
    }
    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
  }

  function sortIndicator(column: SortColumn) {
    if (sortColumn !== column) return "";
    return sortDirection === "asc" ? " ↑" : " ↓";
  }

  if (rows.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Szukaj po nazwie lub NIP…"
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-gray-500">
          {filtered.length} / {rows.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Brak wyników wyszukiwania.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-gray-200 bg-white text-gray-500">
                <th className="cursor-pointer py-2 font-medium select-none" onClick={() => toggleSort("nip")}>
                  NIP{sortIndicator("nip")}
                </th>
                <th className="cursor-pointer py-2 font-medium select-none" onClick={() => toggleSort("name")}>
                  Nazwa{sortIndicator("name")}
                </th>
                <th
                  className="cursor-pointer py-2 text-right font-medium select-none"
                  onClick={() => toggleSort("revenue")}
                >
                  {revenueLabel}
                  {sortIndicator("revenue")}
                </th>
                <th
                  className="cursor-pointer py-2 text-right font-medium select-none"
                  onClick={() => toggleSort("invoiceTotal")}
                >
                  Suma faktur{sortIndicator("invoiceTotal")}
                </th>
                <th className="py-2 font-medium">Dokumenty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.nip} className="border-b border-gray-100 align-top even:bg-gray-50">
                  <td className="py-2">{row.nip}</td>
                  <td className="py-2">{clientNames[row.nip] ?? "(nieznana nazwa)"}</td>
                  <td className="py-2 text-right">{formatZl(row.revenueGrosze)}</td>
                  <td className="py-2 text-right">{formatZl(row.invoiceTotalGrosze)}</td>
                  <td className="py-2">
                    <DocumentsCell documentNumbers={row.documentNumbers} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
