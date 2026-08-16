export interface FlaggedFact {
  flag: "F" | "G" | "H" | "I" | null;
  amountGrosze: number;
}

export interface FlagBreakdown {
  total: number;
  F: number;
  G: number;
  H: number;
  I: number;
  corrections: number;
}

/**
 * Sumuje kwoty z podziałem na flagę (SPEC.md III.A, zestawienia 2-11).
 * Wersy bez flagi (flag: null) to korekty (FKS) - pokazywane jako osobna
 * pozycja "korekty" (decyzja V.10), nie wliczane do żadnej z F/G/H/I.
 * Niezmiennik: F + G + H + I + corrections === total.
 */
export function sumByFlag(facts: FlaggedFact[]): FlagBreakdown {
  const breakdown: FlagBreakdown = { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 };

  for (const fact of facts) {
    breakdown.total += fact.amountGrosze;
    if (fact.flag === null) {
      breakdown.corrections += fact.amountGrosze;
    } else {
      breakdown[fact.flag] += fact.amountGrosze;
    }
  }

  return breakdown;
}
