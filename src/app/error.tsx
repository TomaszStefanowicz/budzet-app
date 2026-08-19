"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
        <h1 className="mb-2 text-xl font-bold text-gray-900">Coś poszło nie tak</h1>
        <p className="mb-4 text-sm text-gray-500">
          Wystąpił nieoczekiwany błąd. Spróbuj ponownie lub wróć do strony głównej.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Spróbuj ponownie
          </button>
          <Link
            href="/"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Strona główna
          </Link>
        </div>
      </div>
    </div>
  );
}
