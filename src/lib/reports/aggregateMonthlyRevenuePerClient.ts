export interface RevenueFact {
  nip: string;
  month: string;
  amountGrosze: number;
}

export interface ClientMonthlyRevenue {
  nip: string;
  month: string;
  totalGrosze: number;
}

/**
 * Agreguje przychody miesięczne per klient (SPEC.md 11a) - klient wchodzi do
 * wyniku za dany miesiąc wyłącznie, gdy zagregowany przychód jest > 0. Czysta
 * funkcja: nie filtruje po fladze ani is_active - to decyduje wywołujący,
 * przekazując tylko te fakty, które mają wejść do agregacji (np. wszystkie
 * aktywne wersy dla zestawienia 12; F/G/H + FKS, bez I, dla zestawień 13-15).
 */
export function aggregateMonthlyRevenuePerClient(facts: RevenueFact[]): ClientMonthlyRevenue[] {
  const totals = new Map<string, { nip: string; month: string; totalGrosze: number }>();

  for (const fact of facts) {
    const key = `${fact.nip}|${fact.month}`;
    const existing = totals.get(key);
    if (existing) {
      existing.totalGrosze += fact.amountGrosze;
    } else {
      totals.set(key, { nip: fact.nip, month: fact.month, totalGrosze: fact.amountGrosze });
    }
  }

  return Array.from(totals.values()).filter((entry) => entry.totalGrosze > 0);
}
