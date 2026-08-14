"use client";

import { useState } from "react";

interface UploadResult {
  fileName: string;
  rowCount: number;
  monthRange: { fromYear: number; fromMonth: number; toYear: number; toMonth: number } | null;
}

export function UploadForm() {
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    const file = fileInput.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/import", { method: "POST", body: formData });
    setLoading(false);

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Nie udało się przetworzyć pliku.");
      return;
    }

    setResult(await response.json());
  }

  return (
    <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="mb-4 text-lg font-semibold text-gray-900">Import pliku sprzedażowego</h1>

      <form onSubmit={handleSubmit} className="flex items-center gap-3">
        <input type="file" name="file" accept=".xlsx" required className="text-sm" />
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Wczytywanie…" : "Wczytaj"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-3 text-sm text-gray-700">
          <p>
            Plik <span className="font-medium">{result.fileName}</span>: odczytano{" "}
            <span className="font-medium">{result.rowCount}</span> wersów.
          </p>
          {result.monthRange && (
            <p>
              Wykryty zakres miesięcy: {result.monthRange.fromYear}/
              {String(result.monthRange.fromMonth).padStart(2, "0")} – {result.monthRange.toYear}/
              {String(result.monthRange.toMonth).padStart(2, "0")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
