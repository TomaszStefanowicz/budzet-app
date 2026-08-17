"use client";

import { useRouter } from "next/navigation";

function toLabel(month: string): string {
  const [year, monthNum] = month.slice(0, 7).split("-");
  return `${year}/${monthNum}`;
}

export function MonthSelect({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(event) => router.push(`/reports?month=${event.target.value}`)}
      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
    >
      {months.map((month) => (
        <option key={month} value={month}>
          {toLabel(month)}
        </option>
      ))}
    </select>
  );
}
