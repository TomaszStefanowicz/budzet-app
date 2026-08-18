"use client";

import { useMemo, useState, useTransition } from "react";
import { ClientTypeSelect } from "./ClientTypeSelect";
import { updateClientTypeBulk } from "./actions";

const BULK_TYPE_OPTIONS = ["bank", "SKOK", "inny", "nieokreślony"] as const;

type Client = {
  nip: string;
  name: string;
  previous_name: string | null;
  type: string;
};

type SortColumn = "nip" | "name" | "type";
type SortDirection = "asc" | "desc";

export function ClientsTable({ clients }: { clients: Client[] }) {
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkType, setBulkType] = useState<string>(BULK_TYPE_OPTIONS[0]);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const result = term
      ? clients.filter((c) => c.name.toLowerCase().includes(term) || c.nip.toLowerCase().includes(term))
      : clients;

    if (!sortColumn) return result;

    const sorted = [...result].sort((a, b) => {
      const cmp = a[sortColumn].localeCompare(b[sortColumn], "pl");
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [clients, search, sortColumn, sortDirection]);

  const filteredNips = useMemo(() => filtered.map((c) => c.nip), [filtered]);
  const allFilteredSelected = filteredNips.length > 0 && filteredNips.every((nip) => selected.has(nip));

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

  function toggleRow(nip: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(nip)) next.delete(nip);
      else next.add(nip);
      return next;
    });
  }

  function toggleSelectAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredNips.forEach((nip) => next.delete(nip));
      } else {
        filteredNips.forEach((nip) => next.add(nip));
      }
      return next;
    });
  }

  function applyBulkType() {
    setBulkError(null);
    const nips = Array.from(selected);
    startTransition(async () => {
      try {
        await updateClientTypeBulk(nips, bulkType);
        setSelected(new Set());
      } catch (e) {
        setBulkError(e instanceof Error ? e.message : "Błąd zapisu.");
      }
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj po nazwie lub NIP…"
          className="w-64 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        />
        <span className="text-sm text-gray-500">
          {filtered.length} / {clients.length}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">{selected.size} zaznaczonych</span>
          <select
            value={bulkType}
            onChange={(e) => setBulkType(e.target.value)}
            disabled={selected.size === 0 || isPending}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
          >
            {BULK_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={applyBulkType}
            disabled={selected.size === 0 || isPending}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Ustaw typ dla zaznaczonych
          </button>
        </div>
      </div>

      {bulkError && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{bulkError}</p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Brak klientów pasujących do wyszukiwania.</p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-gray-200 bg-white text-gray-500">
                <th className="w-8 py-2">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    aria-label="Zaznacz wszystkie widoczne"
                  />
                </th>
                <th className="cursor-pointer py-2 font-medium select-none" onClick={() => toggleSort("nip")}>
                  NIP{sortIndicator("nip")}
                </th>
                <th className="cursor-pointer py-2 font-medium select-none" onClick={() => toggleSort("name")}>
                  Nazwa{sortIndicator("name")}
                </th>
                <th className="cursor-pointer py-2 font-medium select-none" onClick={() => toggleSort("type")}>
                  Typ{sortIndicator("type")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.nip}
                  className={`border-b border-gray-100 ${c.type === "nieokreślony" ? "bg-amber-50" : "even:bg-gray-50"}`}
                >
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(c.nip)}
                      onChange={() => toggleRow(c.nip)}
                      aria-label={`Zaznacz ${c.name}`}
                    />
                  </td>
                  <td className="py-2">{c.nip}</td>
                  <td className="py-2">
                    {c.name}
                    {c.previous_name && (
                      <span className="ml-1 text-xs text-gray-400">(dawniej: {c.previous_name})</span>
                    )}
                  </td>
                  <td className="py-2">
                    <ClientTypeSelect nip={c.nip} type={c.type} />
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
