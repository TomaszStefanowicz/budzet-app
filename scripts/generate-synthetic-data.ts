/**
 * Generator danych syntetycznych (SPEC.md 0.7 / VI.9).
 *
 * Tryby:
 *   --clean       (domyślny) — dane w całości poprawne, do zasilenia instancji demo.
 *   --with-errors — to samo plus celowo błędne wersy, wyłącznie do testów walidacji.
 *
 * Wszystkie kwoty liczone w groszach (liczby całkowite) przez cały czas trwania
 * obliczeń; konwersja na PLN (podział przez 100) następuje wyłącznie przy zapisie
 * komórki do arkusza (CLAUDE.md pkt 7).
 *
 * Generator jest deterministyczny: ziarno PRNG i zakresy dat są stałe, więc ten
 * sam kod zawsze produkuje ten sam plik — to warunek konieczny, żeby plik mógł
 * pełnić rolę "golden file" w testach.
 */

import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

// --- Konfiguracja czasowa -------------------------------------------------

const MONTH_COL_START = { year: 2024, month: 1 };
const MONTH_COL_END = { year: 2027, month: 12 }; // SPEC.md: "dziś dane sięgają grudnia 2027"
const INVOICE_END = { year: 2026, month: 6 }; // ostatni miesiąc wystawiania faktur (stały, dla powtarzalności)

function monthIndex(year: number, month: number): number {
  return (year - MONTH_COL_START.year) * 12 + (month - MONTH_COL_START.month);
}

function monthFromIndex(idx: number): { year: number; month: number } {
  return {
    year: MONTH_COL_START.year + Math.floor(idx / 12),
    month: (idx % 12) + 1,
  };
}

function formatYearMonth(idx: number): string {
  const { year, month } = monthFromIndex(idx);
  return `${year}/${String(month).padStart(2, "0")}`;
}

const MONTH_COL_END_IDX = monthIndex(MONTH_COL_END.year, MONTH_COL_END.month);
const INVOICE_END_IDX = monthIndex(INVOICE_END.year, INVOICE_END.month);

// --- PRNG (deterministyczny, bez Math.random) -----------------------------

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type RandomFn = () => number;

function randInt(rand: RandomFn, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// --- NIP z poprawną sumą kontrolną ----------------------------------------

const NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7];

function nipChecksum(base9: string): number {
  const digits = base9.split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * NIP_WEIGHTS[i], 0);
  return sum % 11;
}

function nipFromBase(base9: string): string {
  const checksum = nipChecksum(base9);
  if (checksum === 10) {
    throw new Error(`Baza NIP ${base9} daje niepoprawną sumę kontrolną (10).`);
  }
  return base9 + String(checksum);
}

function generateRandomNip(rand: RandomFn, usedNips: Set<string>): string {
  while (true) {
    const base9 = Array.from({ length: 9 }, () => randInt(rand, 0, 9)).join("");
    const checksum = nipChecksum(base9);
    if (checksum === 10) continue;
    const nip = base9 + String(checksum);
    if (usedNips.has(nip)) continue;
    usedNips.add(nip);
    return nip;
  }
}

// --- Pieniądze (grosze, liczby całkowite) ---------------------------------

function splitEvenly(totalGrosze: number, months: number): number[] {
  const base = Math.floor(totalGrosze / months);
  const remainder = totalGrosze - base * months;
  const result = new Array(months).fill(base);
  result[months - 1] += remainder;
  return result;
}

// --- Numeracja dokumentów --------------------------------------------------

const docCounters = new Map<string, number>();

function nextDocNumber(type: string, year: number, month: number): string {
  const key = `${type}-${year}-${month}`;
  const next = (docCounters.get(key) ?? 0) + 1;
  docCounters.set(key, next);
  return `${type}/${year}/${String(month).padStart(2, "0")}/${String(next).padStart(4, "0")}`;
}

// --- Model wersu -----------------------------------------------------------

interface DataRow {
  clientName: string;
  nip: string;
  docType: string;
  saleMonthIdx: number; // z segmentu rrrr/mm numeru dokumentu
  netGrosze: number; // może być ujemne dla FKS
  flags: { F: boolean; G: boolean; H: boolean; I: boolean };
  monthlyGrosze: Map<number, number>; // indeks miesiąca -> grosze (może być ujemne dla FKS)
}

function noFlags() {
  return { F: false, G: false, H: false, I: false };
}

function makeMonthly(startIdx: number, amounts: number[]): Map<number, number> {
  const map = new Map<number, number>();
  amounts.forEach((amount, i) => map.set(startIdx + i, amount));
  return map;
}

/**
 * Rozkłada miesięczny wpływ korekty (FKS) na miesiące zgodnie z zasadą
 * nieretroaktywności ksiąg (SPEC.md V.33): miesiące wcześniejsze niż własny
 * miesiąc sprzedaży korekty są już zrealizowane (zamknięte) - ich reversal
 * jest skumulowany i ujęty w całości w miesiącu sprzedaży korekty, zamiast
 * wracać do tamtych miesięcy. Miesiące od miesiąca korekty wzwyż (bieżący
 * i przyszłe) zachowują własny, osobny odwrócony odpis w swoim miesiącu.
 */
function correctionMonthly(
  originalMonthly: Map<number, number>,
  correctionSaleMonthIdx: number
): Map<number, number> {
  const map = new Map<number, number>();
  let alreadyRealizedLump = 0;

  for (const [idx, amount] of originalMonthly) {
    if (idx < correctionSaleMonthIdx) {
      alreadyRealizedLump += -amount;
    } else {
      map.set(idx, (map.get(idx) ?? 0) + -amount);
    }
  }

  if (alreadyRealizedLump !== 0) {
    map.set(correctionSaleMonthIdx, (map.get(correctionSaleMonthIdx) ?? 0) + alreadyRealizedLump);
  }

  return map;
}

// --- Nazwy klientów (jednoznacznie fikcyjne) -------------------------------

function bulkClientName(index: number): string {
  return `Przykładowa Firma ${String(index + 1).padStart(3, "0")} Sp. z o.o.`;
}

// --- Rozkład długości rozliczenia (SPEC.md III.B / II.3.c) -----------------

function pickDuration(rand: RandomFn): number {
  const r = rand();
  if (r < 0.05) return randInt(rand, 2, 9); // 5%: 2-9 miesięcy
  if (r < 0.1) return randInt(rand, 10, 11); // 5%: 10-11 miesięcy
  if (r < 0.9) return 12; // 80%: 12 miesięcy
  return 24; // 10%: 24 miesiące
}

function maxStartIdxForDuration(duration: number): number {
  return Math.min(INVOICE_END_IDX, MONTH_COL_END_IDX - duration + 1);
}

// --- Generowanie masowych klientów (zawsze poprawne dane) ------------------

function generateBulkClients(rand: RandomFn, count: number, usedNips: Set<string>): DataRow[] {
  const rows: DataRow[] = [];

  for (let i = 0; i < count; i++) {
    const nip = generateRandomNip(rand, usedNips);
    const name = bulkClientName(i);

    // Tylko wersy F/G wyznaczają "dostęp do platformy" (SPEC.md II.2) - flaga I
    // to jednorazowy zakup niezwiązany z dostępem i nie może liczyć się do
    // przerwy między pakietami (SPEC.md II.3.g), dlatego śledzimy koniec
    // ostatniego dostępu osobno, nie jako "poprzedni wers w ogóle".
    let lastAccessEnd: number | null = null;
    let currentIdx = randInt(rand, 0, INVOICE_END_IDX);

    while (currentIdx <= INVOICE_END_IDX) {
      const wantsIncydentalny = rand() < 0.15;
      const duration = wantsIncydentalny ? 1 : pickDuration(rand);

      const maxStart = maxStartIdxForDuration(duration);
      if (currentIdx > maxStart) break; // nie zmieści się w horyzoncie danych - kończymy łańcuch klienta

      const endIdx = currentIdx + duration - 1;

      let flag: "F" | "G" | "H" | "I";
      if (duration === 1) {
        flag = "I";
      } else if (lastAccessEnd === null) {
        flag = "F";
      } else {
        const gapMonths = currentIdx - lastAccessEnd;
        flag = gapMonths > 12 ? "F" : "G";
      }

      const monthlyRateGrosze =
        flag === "I" ? randInt(rand, 150000, 2500000) : randInt(rand, 80000, 400000);
      const totalGrosze = flag === "I" ? monthlyRateGrosze : monthlyRateGrosze * duration;
      const amounts = splitEvenly(totalGrosze, duration);

      let docType = "FVS";
      const typeRoll = rand();
      if (typeRoll < 0.08) docType = "FVZ";
      else if (typeRoll < 0.12 && flag === "I") docType = "FVZK";

      rows.push({
        clientName: name,
        nip,
        docType,
        saleMonthIdx: currentIdx,
        netGrosze: totalGrosze,
        flags: { F: flag === "F", G: flag === "G", H: false, I: flag === "I" },
        monthlyGrosze: makeMonthly(currentIdx, amounts),
      });

      if (flag === "F" || flag === "G") {
        lastAccessEnd = endIdx;
      }

      // Dokupienie (H) w trakcie aktywnego okresu - opcjonalnie.
      if (flag !== "I" && rand() < 0.45) {
        const addOnStart = randInt(rand, currentIdx, endIdx);
        const addOnDuration = randInt(rand, 2, 12);
        const addOnMaxStart = maxStartIdxForDuration(addOnDuration);
        if (addOnStart <= addOnMaxStart) {
          const addOnRate = randInt(rand, 20000, 80000);
          const addOnTotal = addOnRate * addOnDuration;
          rows.push({
            clientName: name,
            nip,
            docType: rand() < 0.1 ? "FVZK" : "FVS",
            saleMonthIdx: addOnStart,
            netGrosze: addOnTotal,
            flags: { F: false, G: false, H: true, I: false },
            monthlyGrosze: makeMonthly(addOnStart, splitEvenly(addOnTotal, addOnDuration)),
          });
        }
      }

      // Kolejny cykl: albo przedłużenie (mały odstęp), albo przerwa, albo koniec łańcucha.
      const continues = rand() < 0.78;
      if (!continues) break;
      const gapRoll = rand();
      const gap = gapRoll < 0.7 ? randInt(rand, 0, 5) : randInt(rand, 6, 16);
      currentIdx = endIdx + 1 + gap;
    }

    // Sporadyczne, niezależne zakupy incydentalne (np. szkolenia, prace developerskie).
    if (rand() < 0.35) {
      const startIdx = randInt(rand, 0, INVOICE_END_IDX);
      const total = randInt(rand, 200000, 3000000);
      rows.push({
        clientName: name,
        nip,
        docType: "FVS",
        saleMonthIdx: startIdx,
        netGrosze: total,
        flags: { F: false, G: false, H: false, I: true },
        monthlyGrosze: makeMonthly(startIdx, [total]),
      });
    }
  }

  return rows;
}

// --- Korekty (FKS) ----------------------------------------------------------

function addCorrections(rand: RandomFn, rows: DataRow[]): DataRow[] {
  // FKS może korygować też zakup incydentalny (SPEC.md V.13: świadomie zaakceptowane zaburzenie).
  const corrections: DataRow[] = [];
  for (const row of rows) {
    if (rand() >= 0.05) continue;

    const correctionMonthIdx = Math.min(row.saleMonthIdx + randInt(rand, 1, 2), INVOICE_END_IDX);
    corrections.push({
      clientName: row.clientName,
      nip: row.nip,
      docType: "FKS",
      saleMonthIdx: correctionMonthIdx,
      netGrosze: -row.netGrosze,
      flags: noFlags(),
      monthlyGrosze: correctionMonthly(row.monthlyGrosze, correctionMonthIdx),
    });
  }
  return corrections;
}

// --- Celowo zaszyte przypadki brzegowe (bez losowości - zawsze te same) ----

interface EdgeCaseResult {
  validRows: DataRow[];
  errorRows: DataRow[];
  manifest: { name: string; nip: string; description: string; expectedOutcome: string }[];
}

function buildEdgeCases(): EdgeCaseResult {
  const validRows: DataRow[] = [];
  const errorRows: DataRow[] = [];
  const manifest: EdgeCaseResult["manifest"] = [];

  // EC1: FKS - korekta w pełni niweluje wcześniejszą fakturę.
  {
    const nip = nipFromBase("100000001");
    const name = "Przykładowa Firma - Korekta FKS";
    const startIdx = monthIndex(2024, 3);
    const duration = 12;
    const total = 1200 * 100 * duration;
    const amounts = splitEvenly(total, duration);
    validRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: startIdx,
      netGrosze: total,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(startIdx, amounts),
    });
    validRows.push({
      clientName: name,
      nip,
      docType: "FKS",
      saleMonthIdx: monthIndex(2024, 5),
      netGrosze: -total,
      flags: noFlags(),
      monthlyGrosze: correctionMonthly(makeMonthly(startIdx, amounts), monthIndex(2024, 5)),
    });
    manifest.push({
      name,
      nip,
      description: "Faktura FVS (F, 12 mies.) + korekta FKS niwelująca ją w całości.",
      expectedOutcome: "poprawny import; suma F + korekty = 0 dla tego klienta",
    });
  }

  // EC2: FVZK z flagą I.
  {
    const nip = nipFromBase("100000002");
    const name = "Przykładowa Firma - FVZK";
    const startIdx = monthIndex(2024, 6);
    const total = 5000 * 100;
    validRows.push({
      clientName: name,
      nip,
      docType: "FVZK",
      saleMonthIdx: startIdx,
      netGrosze: total,
      flags: { F: false, G: false, H: false, I: true },
      monthlyGrosze: makeMonthly(startIdx, [total]),
    });
    manifest.push({
      name,
      nip,
      description: "Faktura zaliczkowa końcowa (FVZK) z flagą incydentalny (I).",
      expectedOutcome: "poprawny import",
    });
  }

  // EC3: powrót po 13 miesiącach, poprawnie F.
  {
    const nip = nipFromBase("100000003");
    const name = "Przykładowa Firma - Powrot po 13 miesiacach (F)";
    const firstStart = monthIndex(2024, 1);
    const firstDuration = 12;
    const firstAmounts = splitEvenly(1000 * 100 * firstDuration, firstDuration);
    validRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: firstStart,
      netGrosze: 1000 * 100 * firstDuration,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(firstStart, firstAmounts),
    });
    const secondStart = firstStart + firstDuration - 1 + 13; // gap = 13 miesięcy
    const secondAmounts = splitEvenly(1000 * 100 * 12, 12);
    validRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: secondStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(secondStart, secondAmounts),
    });
    manifest.push({
      name,
      nip,
      description: "Pierwszy dostęp 12 mies., przerwa 13 miesięcy, powrót z flagą F.",
      expectedOutcome: "poprawny import (gap 13 > 12 -> F poprawne)",
    });
  }

  // EC4: powrót po 11 miesiącach, poprawnie G.
  {
    const nip = nipFromBase("100000004");
    const name = "Przykładowa Firma - Powrot po 11 miesiacach (G)";
    const firstStart = monthIndex(2024, 1);
    const firstAmounts = splitEvenly(1000 * 100 * 12, 12);
    validRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: firstStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(firstStart, firstAmounts),
    });
    const secondStart = firstStart + 12 - 1 + 11; // gap = 11 miesięcy
    const secondAmounts = splitEvenly(1000 * 100 * 12, 12);
    validRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: secondStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: false, G: true, H: false, I: false },
      monthlyGrosze: makeMonthly(secondStart, secondAmounts),
    });
    manifest.push({
      name,
      nip,
      description: "Pierwszy dostęp 12 mies., przerwa 11 miesięcy, powrót z flagą G.",
      expectedOutcome: "poprawny import (gap 11 <= 12 -> G poprawne)",
    });
  }

  // EC5: pakiet na granicy horyzontu danych (kończy się w ostatnim widocznym miesiącu).
  {
    const nip = nipFromBase("100000005");
    const name = "Przykładowa Firma - Granica horyzontu danych";
    const startIdx = MONTH_COL_END_IDX - 12 + 1;
    const amounts = splitEvenly(1000 * 100 * 12, 12);
    validRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: startIdx,
      netGrosze: 1000 * 100 * 12,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(startIdx, amounts),
    });
    manifest.push({
      name,
      nip,
      description: `Pakiet 12 mies. kończący się dokładnie w ostatnim miesiącu danych (${formatYearMonth(MONTH_COL_END_IDX)}).`,
      expectedOutcome:
        "poprawny import; zestawienie 13 NIE zgłasza tego klienta jako wygasającego w ostatnim miesiącu danych (brak kolumny M+1)",
    });
  }

  // EC6: brak flagi (błąd).
  {
    const nip = nipFromBase("100000006");
    const name = "Przykładowa Firma - Brak flagi (blad)";
    const startIdx = monthIndex(2025, 2);
    const amounts = splitEvenly(1000 * 100 * 6, 6);
    errorRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: startIdx,
      netGrosze: 1000 * 100 * 6,
      flags: noFlags(),
      monthlyGrosze: makeMonthly(startIdx, amounts),
    });
    manifest.push({
      name,
      nip,
      description: "Wers FVS bez żadnej flagi F/G/H/I.",
      expectedOutcome: "import odrzucony w całości (SPEC.md II.3.b)",
    });
  }

  // EC7: dwie flagi (błąd).
  {
    const nip = nipFromBase("100000007");
    const name = "Przykładowa Firma - Dwie flagi (blad)";
    const startIdx = monthIndex(2025, 3);
    const amounts = splitEvenly(1000 * 100 * 6, 6);
    errorRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: startIdx,
      netGrosze: 1000 * 100 * 6,
      flags: { F: true, G: true, H: false, I: false },
      monthlyGrosze: makeMonthly(startIdx, amounts),
    });
    manifest.push({
      name,
      nip,
      description: "Wers FVS z dwiema flagami (F i G) jednocześnie.",
      expectedOutcome: "import odrzucony w całości (SPEC.md II.3.b)",
    });
  }

  // EC8: nieznany typ dokumentu (błąd).
  {
    const nip = nipFromBase("100000008");
    const name = "Przykładowa Firma - Nieznany typ dokumentu (blad)";
    const startIdx = monthIndex(2025, 4);
    const amounts = splitEvenly(1000 * 100 * 3, 3);
    errorRows.push({
      clientName: name,
      nip,
      docType: "XYZ",
      saleMonthIdx: startIdx,
      netGrosze: 1000 * 100 * 3,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(startIdx, amounts),
    });
    manifest.push({
      name,
      nip,
      description: "Wers z nieznanym typem dokumentu (XYZ zamiast FVS/FKS/FVZ/FVZK).",
      expectedOutcome: "import odrzucony w całości (SPEC.md II.3.h)",
    });
  }

  // EC9: powrót po 11 miesiącach błędnie oznaczony F (błąd - powinno być G).
  {
    const nip = nipFromBase("100000009");
    const name = "Przykładowa Firma - Powrot po 11 miesiacach bledny F (blad)";
    const firstStart = monthIndex(2024, 1);
    const firstAmounts = splitEvenly(1000 * 100 * 12, 12);
    errorRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: firstStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(firstStart, firstAmounts),
    });
    const secondStart = firstStart + 12 - 1 + 11;
    const secondAmounts = splitEvenly(1000 * 100 * 12, 12);
    errorRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: secondStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(secondStart, secondAmounts),
    });
    manifest.push({
      name,
      nip,
      description: "Powrót po 11 miesiącach błędnie oznaczony jako F (powinno być G).",
      expectedOutcome: "import odrzucony w całości (SPEC.md II.3.g.i)",
    });
  }

  // EC10: powrót po 13 miesiącach błędnie oznaczony G (błąd - powinno być F).
  {
    const nip = nipFromBase("100000011");
    const name = "Przykładowa Firma - Powrot po 13 miesiacach bledny G (blad)";
    const firstStart = monthIndex(2024, 1);
    const firstAmounts = splitEvenly(1000 * 100 * 12, 12);
    errorRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: firstStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: true, G: false, H: false, I: false },
      monthlyGrosze: makeMonthly(firstStart, firstAmounts),
    });
    const secondStart = firstStart + 12 - 1 + 13;
    const secondAmounts = splitEvenly(1000 * 100 * 12, 12);
    errorRows.push({
      clientName: name,
      nip,
      docType: "FVS",
      saleMonthIdx: secondStart,
      netGrosze: 1000 * 100 * 12,
      flags: { F: false, G: true, H: false, I: false },
      monthlyGrosze: makeMonthly(secondStart, secondAmounts),
    });
    manifest.push({
      name,
      nip,
      description: "Powrót po 13 miesiącach błędnie oznaczony jako G (powinno być F).",
      expectedOutcome: "import odrzucony w całości (SPEC.md II.3.g.ii)",
    });
  }

  return { validRows, errorRows, manifest };
}

// --- Finalizacja: numeracja dokumentów, sortowanie, arkusz -----------------

function finalizeRows(rows: DataRow[]): (string | number | null)[][] {
  const sorted = [...rows].sort((a, b) => {
    if (a.saleMonthIdx !== b.saleMonthIdx) return a.saleMonthIdx - b.saleMonthIdx;
    if (a.docType !== b.docType) return a.docType.localeCompare(b.docType);
    return a.nip.localeCompare(b.nip);
  });

  const totalMonths = MONTH_COL_END_IDX + 1;
  const out: (string | number | null)[][] = [];

  const header: (string | number | null)[] = [
    "lp",
    "nazwa klienta",
    "NIP",
    "numer dokumentu",
    "wartość netto",
    "nowy dostęp (F)",
    "przedłużenie (G)",
    "dokupienie (H)",
    "incydentalny (I)",
  ];
  for (let i = 0; i < totalMonths; i++) header.push(formatYearMonth(i));
  out.push(header);

  sorted.forEach((row, i) => {
    const { year, month } = monthFromIndex(row.saleMonthIdx);
    const docNumber = nextDocNumber(row.docType, year, month);

    const line: (string | number | null)[] = [
      i + 1,
      row.clientName,
      row.nip,
      docNumber,
      Number((row.netGrosze / 100).toFixed(2)),
      row.flags.F ? 1 : null,
      row.flags.G ? 1 : null,
      row.flags.H ? 1 : null,
      row.flags.I ? 1 : null,
    ];
    for (let m = 0; m < totalMonths; m++) {
      const grosze = row.monthlyGrosze.get(m);
      line.push(grosze === undefined ? null : Number((grosze / 100).toFixed(2)));
    }
    out.push(line);
  });

  return out;
}

// --- Główna funkcja ----------------------------------------------------------

function main() {
  const withErrors = process.argv.includes("--with-errors");

  const rand = mulberry32(20260814); // stałe ziarno = powtarzalne wyniki
  const usedNips = new Set<string>();
  // rezerwujemy bazy NIP używane przez zaszyte przypadki brzegowe, żeby generator losowy ich nie powielił
  for (let n = 1; n <= 11; n++) usedNips.add(nipFromBase(String(1e8 + n).padStart(9, "0")));

  const bulkRows = generateBulkClients(rand, 500, usedNips);
  const corrections = addCorrections(rand, bulkRows);
  const edgeCases = buildEdgeCases();

  const commonRows = [...bulkRows, ...corrections, ...edgeCases.validRows];
  const allRows = withErrors ? [...commonRows, ...edgeCases.errorRows] : commonRows;

  const sheetData = finalizeRows(allRows);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sprzedaz");

  const outDir = path.join(process.cwd(), "test-data");
  mkdirSync(outDir, { recursive: true });
  const suffix = withErrors ? "with-errors" : "clean";
  const outPath = path.join(outDir, `dane-syntetyczne-${suffix}.xlsx`);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  writeFileSync(outPath, buffer);

  const manifest = {
    tryb: suffix,
    liczbaWersow: allRows.length,
    liczbaKlientowMasowych: 500,
    zakresMiesiecyDanych: `${formatYearMonth(0)} - ${formatYearMonth(MONTH_COL_END_IDX)}`,
    zakresWystawianiaFaktur: `${formatYearMonth(0)} - ${formatYearMonth(INVOICE_END_IDX)}`,
    przypadkiBrzegowe: withErrors
      ? edgeCases.manifest
      : edgeCases.manifest.filter((_, i) => i < 5),
  };
  writeFileSync(
    path.join(outDir, `dane-syntetyczne-${suffix}.manifest.json`),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );

  console.log(`Zapisano ${outPath} (${allRows.length} wersów).`);
}

main();
