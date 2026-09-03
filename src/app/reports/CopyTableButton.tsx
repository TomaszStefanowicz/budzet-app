"use client";

import { useState } from "react";

/**
 * Kopiuje tabelę do schowka jako TSV (tabulatory między komórkami, nowa
 * linia między wierszami) - wklejona do Excela ląduje we właściwych
 * kolumnach, tak jak przy kopiowaniu zakresu komórek. `rows` zawiera już
 * wiersz nagłówkowy jako pierwszy element.
 */
export function CopyTableButton({ rows }: { rows: (string | number)[][] }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const tsv = rows.map((row) => row.join("\t")).join("\n");
    await navigator.clipboard.writeText(tsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
    >
      {copied ? "Skopiowano ✓" : "Kopiuj do Excela"}
    </button>
  );
}
