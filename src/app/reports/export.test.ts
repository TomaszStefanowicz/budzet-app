import { describe, expect, it } from "vitest";
import { buildSummarySheetRows, buildClientsSheetRows, buildBanksAndSkoksSheetRows } from "./export";
import type { MonthlySummary } from "@/lib/reports/buildMonthlySummary";
import type { ClientRevenueReportRow } from "@/lib/reports/buildClientMonthlyRevenueReport";

describe("buildSummarySheetRows", () => {
  it("formatuje grosze jako liczby złotych (w tym korekty ujemne)", () => {
    const summary: MonthlySummary = {
      payingClientsCount: 3,
      salesBreakdown: { total: 140000, F: 100000, G: 50000, H: 0, I: 0, corrections: -10000 },
      revenueBreakdown: { total: 60000, F: 40000, G: 20000, H: 0, I: 0, corrections: 0 },
    };

    const rows = buildSummarySheetRows(summary);

    expect(rows[0]).toEqual(["Zestawienie", "Wartość"]);
    expect(rows).toContainEqual(["1. Liczba klientów, którzy zapłacili", 3]);
    expect(rows).toContainEqual(["2. Wartość sprzedaży — razem", 1400]);
    expect(rows).toContainEqual(["— w tym korekty (sprzedaż)", -100]);
  });
});

describe("buildClientsSheetRows", () => {
  it("zawiera nagłówek i wiersz per klient z nazwą ze słownika", () => {
    const clientReport: ClientRevenueReportRow[] = [
      { nip: "1000000029", revenueGrosze: 705833, invoiceTotalGrosze: 8470000, documentNumbers: ["FVS/2026/03/0001"] },
    ];
    const clientNames = new Map([["1000000029", "Przykładowa Firma - FVZK"]]);

    const rows = buildClientsSheetRows(clientReport, clientNames);

    expect(rows[0]).toEqual(["NIP", "Nazwa", "Przychód miesiąca", "Suma faktur", "Dokumenty"]);
    expect(rows[1]).toEqual([
      "1000000029",
      "Przykładowa Firma - FVZK",
      7058.33,
      84700,
      "FVS/2026/03/0001",
    ]);
  });

  it("pokazuje etykietę zastępczą, gdy NIP nie ma nazwy w słowniku", () => {
    const clientReport: ClientRevenueReportRow[] = [
      { nip: "9999999999", revenueGrosze: 100, invoiceTotalGrosze: 100, documentNumbers: [] },
    ];

    const rows = buildClientsSheetRows(clientReport, new Map());

    expect(rows[1][1]).toBe("(nieznana nazwa)");
  });
});

describe("buildBanksAndSkoksSheetRows", () => {
  it("używa tego samego układu kolumn co zestawienie 12 (zestawienie 16, decyzja V.45/V.46)", () => {
    const banksAndSkoksReport: ClientRevenueReportRow[] = [
      { nip: "1000000029", revenueGrosze: 705833, invoiceTotalGrosze: 8470000, documentNumbers: ["FVS/2026/03/0001"] },
    ];
    const clientNames = new Map([["1000000029", "Bank Spółdzielczy w Przykładowie"]]);

    const rows = buildBanksAndSkoksSheetRows(banksAndSkoksReport, clientNames);

    expect(rows[0]).toEqual(["NIP", "Nazwa", "Przychód miesiąca", "Suma faktur", "Dokumenty"]);
    expect(rows[1]).toEqual(["1000000029", "Bank Spółdzielczy w Przykładowie", 7058.33, 84700, "FVS/2026/03/0001"]);
  });
});
