import { describe, expect, it } from "vitest";
import {
  archivedRowToReportRow,
  archivedBreakdownToGrosze,
  archivedSummaryToMonthlySummary,
  archivedClientNames,
} from "./archivedPayload";
import type { ArchivedPayload } from "./archivedPayload";

describe("archivedRowToReportRow", () => {
  it("zamienia złotówki z powrotem na grosze", () => {
    const row = archivedRowToReportRow({
      nip: "1000000029",
      name: "Testowa Sp. z o.o.",
      revenueZl: 7058.33,
      invoiceTotalZl: 84700,
      documentNumbers: ["FVS/2026/03/0001"],
    });
    expect(row).toEqual({
      nip: "1000000029",
      revenueGrosze: 705833,
      invoiceTotalGrosze: 8470000,
      documentNumbers: ["FVS/2026/03/0001"],
    });
  });

  it("obsługuje brakującą listę dokumentów jako pustą tablicę", () => {
    const row = archivedRowToReportRow({
      nip: "1000000029",
      name: null,
      revenueZl: 100,
      invoiceTotalZl: 100,
      documentNumbers: undefined as unknown as string[],
    });
    expect(row.documentNumbers).toEqual([]);
  });
});

describe("archivedBreakdownToGrosze", () => {
  it("zamienia każde pole rozbicia z powrotem na grosze, w tym korekty ujemne", () => {
    const breakdown = archivedBreakdownToGrosze({ total: 1400, F: 1000, G: 500, H: 0, I: 0, corrections: -100 });
    expect(breakdown).toEqual({ total: 140000, F: 100000, G: 50000, H: 0, I: 0, corrections: -10000 });
  });
});

describe("archivedSummaryToMonthlySummary", () => {
  it("odtwarza MonthlySummary z payloadu archiwum", () => {
    const payload: ArchivedPayload = {
      summary: {
        payingClientsCount: 3,
        salesBreakdownZl: { total: 1400, F: 1000, G: 400, H: 0, I: 0, corrections: 0 },
        revenueBreakdownZl: { total: 600, F: 400, G: 200, H: 0, I: 0, corrections: 0 },
      },
      clients: [],
    };
    const summary = archivedSummaryToMonthlySummary(payload);
    expect(summary.payingClientsCount).toBe(3);
    expect(summary.salesBreakdown.total).toBe(140000);
    expect(summary.revenueBreakdown.total).toBe(60000);
  });
});

describe("archivedClientNames", () => {
  it("łączy nazwy ze wszystkich sekcji migawki", () => {
    const payload: ArchivedPayload = {
      summary: {
        payingClientsCount: 1,
        salesBreakdownZl: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
        revenueBreakdownZl: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
      },
      clients: [{ nip: "1111111111", name: "Klient A", revenueZl: 1, invoiceTotalZl: 1, documentNumbers: [] }],
      expiringClients: [{ nip: "2222222222", name: "Klient B", revenueZl: 0, invoiceTotalZl: 0, documentNumbers: [] }],
    };
    expect(archivedClientNames(payload)).toEqual({ "1111111111": "Klient A", "2222222222": "Klient B" });
  });

  it("pomija sekcje, których nie było w starszej migawce (brak pola)", () => {
    const payload: ArchivedPayload = {
      summary: {
        payingClientsCount: 0,
        salesBreakdownZl: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
        revenueBreakdownZl: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
      },
      clients: [{ nip: "1111111111", name: "Klient A", revenueZl: 1, invoiceTotalZl: 1, documentNumbers: [] }],
    };
    expect(archivedClientNames(payload)).toEqual({ "1111111111": "Klient A" });
  });

  it("pomija wiersze bez nazwy (null)", () => {
    const payload: ArchivedPayload = {
      summary: {
        payingClientsCount: 0,
        salesBreakdownZl: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
        revenueBreakdownZl: { total: 0, F: 0, G: 0, H: 0, I: 0, corrections: 0 },
      },
      clients: [{ nip: "1111111111", name: null, revenueZl: 1, invoiceTotalZl: 1, documentNumbers: [] }],
    };
    expect(archivedClientNames(payload)).toEqual({});
  });
});
