import { describe, expect, it } from "vitest";
import { buildRevenueItemRow } from "./buildRevenueItemRow";
import type { ParsedSalesRow } from "./parseSalesRows";

function baseRow(overrides: Partial<ParsedSalesRow> = {}): ParsedSalesRow {
  return {
    sourceRowNumber: 5,
    clientName: "Firma Testowa",
    nip: "5260001246",
    documentNumber: "FVS/2024/03/0001",
    documentType: "FVS",
    saleMonth: { year: 2024, month: 3 },
    netAmountGrosze: 120000,
    flags: { F: true, G: false, H: false, I: false },
    monthlyAmountsGrosze: [120000],
    ...overrides,
  };
}

describe("buildRevenueItemRow", () => {
  it("mapuje wers na kształt gotowy do insertu", () => {
    const result = buildRevenueItemRow(baseRow(), 42);
    expect(result).toEqual({
      import_id: 42,
      nip: "5260001246",
      document_number: "FVS/2024/03/0001",
      document_type: "FVS",
      sale_month: "2024-03-01",
      net_amount: "1200.00",
      flag: "F",
      source_row_number: 5,
    });
  });

  it("zwraca flag: null dla wersu FKS (bez flag)", () => {
    const result = buildRevenueItemRow(
      baseRow({
        documentNumber: "FKS/2024/05/0002",
        documentType: "FKS",
        netAmountGrosze: -120000,
        flags: { F: false, G: false, H: false, I: false },
      }),
      42
    );
    expect(result.flag).toBeNull();
    expect(result.net_amount).toBe("-1200.00");
  });

  it("wybiera poprawną literę flagi dla G/H/I", () => {
    expect(buildRevenueItemRow(baseRow({ flags: { F: false, G: true, H: false, I: false } }), 1).flag).toBe("G");
    expect(buildRevenueItemRow(baseRow({ flags: { F: false, G: false, H: true, I: false } }), 1).flag).toBe("H");
    expect(buildRevenueItemRow(baseRow({ flags: { F: false, G: false, H: false, I: true } }), 1).flag).toBe("I");
  });
});
