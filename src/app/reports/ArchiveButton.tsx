"use client";

import { useState, useTransition } from "react";
import { archiveReport } from "./actions";

export function ArchiveButton({ month }: { month: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const { archivedAt } = await archiveReport(month);
        setMessage(`Zapisano migawkę: ${new Date(archivedAt).toLocaleString("pl-PL")}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Błąd zapisu do archiwum.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
      >
        {isPending ? "Zapisywanie…" : "Zapisz do archiwum"}
      </button>
      {message && <p className="text-xs text-green-700">{message}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
