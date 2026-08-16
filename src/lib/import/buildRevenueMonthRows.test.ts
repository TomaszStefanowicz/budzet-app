import { describe, expect, it } from "vitest";
import { buildRevenueMonthRows } from "./buildRevenueMonthRows";
import type { ParsedSalesRow } from "./parseSalesRows";

function baseRow(overrides: Partial<ParsedSalesRow> = {}): ParsedSalesRow {
  return {
    sourceRowNumber: 5,
    clientName: "Firma Testowa",
    nip: "5260001246",
    documentNumber: "FVS/2024/01/0001",
    documentType: "FVS",
    saleMonth: { year: 2024, month: 1 },
    netAmountGrosze: 120000,
    flags: { F: true, G: false, H: false, I: false },
    monthlyAmountsGrosze: [120000],
    ...overrides,
  };
}

describe("buildRevenueMonthRows", () => {
  it("buduje wersy dla niezerowych miesięcy z poprawnym miesiącem kalendarzowym", () => {
    const row = baseRow({ monthlyAmountsGrosze: [120000, 0, 60000] }); // sty, luty(0, pomijany), marzec
    const result = buildRevenueMonthRows(row, 99);
    expect(result).toEqual([
      { revenue_item_id: 99, month: "2024-01-01", amount: "1200.00" },
      { revenue_item_id: 99, month: "2024-03-01", amount: "600.00" },
    ]);
  });

  it("pomija miesiące z kwotą zero (puste komórki = 0, SPEC.md II.4)", () => {
    const row = baseRow({ monthlyAmountsGrosze: [0, 0, 0] });
    expect(buildRevenueMonthRows(row, 99)).toEqual([]);
  });

  it("zachowuje ujemne kwoty (korekty FKS)", () => {
    const row = baseRow({ monthlyAmountsGrosze: [-360000, -120000] });
    const result = buildRevenueMonthRows(row, 5);
    expect(result).toEqual([
      { revenue_item_id: 5, month: "2024-01-01", amount: "-3600.00" },
      { revenue_item_id: 5, month: "2024-02-01", amount: "-1200.00" },
    ]);
  });
});
