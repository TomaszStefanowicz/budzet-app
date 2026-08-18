"use client";

import { useRouter } from "next/navigation";

function parseYearMonth(month: string): { year: number; monthNum: number } {
  const [year, monthNum] = month.slice(0, 7).split("-").map(Number);
  return { year, monthNum };
}

export function MonthSelect({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const { year: selectedYear, monthNum: selectedMonthNum } = parseYearMonth(selected);

  const years = Array.from(new Set(months.map((m) => parseYearMonth(m).year))).sort((a, b) => a - b);
  const monthsInSelectedYear = months.filter((m) => parseYearMonth(m).year === selectedYear);

  function navigateTo(month: string) {
    router.push(`/reports?month=${month}`);
  }

  function handleYearChange(newYear: number) {
    const candidates = months.filter((m) => parseYearMonth(m).year === newYear);
    if (candidates.length === 0) return;
    const sameMonth = candidates.find((m) => parseYearMonth(m).monthNum === selectedMonthNum);
    navigateTo(sameMonth ?? candidates[0]);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedYear}
        onChange={(event) => handleYearChange(Number(event.target.value))}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        aria-label="Rok"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
      <select
        value={selected}
        onChange={(event) => navigateTo(event.target.value)}
        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        aria-label="Miesiąc"
      >
        {monthsInSelectedYear.map((month) => (
          <option key={month} value={month}>
            {String(parseYearMonth(month).monthNum).padStart(2, "0")}
          </option>
        ))}
      </select>
    </div>
  );
}
