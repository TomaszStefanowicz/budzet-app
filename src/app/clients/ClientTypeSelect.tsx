"use client";

import { useState, useTransition } from "react";
import { updateClientType } from "./actions";

const TYPE_OPTIONS = ["nieokreślony", "bank", "SKOK", "inny"] as const;

export function ClientTypeSelect({ nip, type }: { nip: string; type: string }) {
  const [value, setValue] = useState(type);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const newType = event.target.value;
    const previousValue = value;
    setValue(newType);
    setError(null);
    startTransition(async () => {
      try {
        await updateClientType(nip, newType);
      } catch (e) {
        setValue(previousValue);
        setError(e instanceof Error ? e.message : "Błąd zapisu.");
      }
    });
  }

  return (
    <div>
      <select
        value={value}
        onChange={handleChange}
        disabled={isPending}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
      >
        {TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
