import { describe, expect, it } from "vitest";
import { buildSourceDataRows, sumSourceDataColumns } from "./buildSourceDataRows";
import type { SourceItemFact } from "./buildSourceDataRows";

describe("buildSourceDataRows", () => {
  it("sortuje po numerze wersu i uzupełnia brakujące miesiące zerem", () => {
    const items: SourceItemFact[] = [
      {
        sourceRowNumber: 5,
        nip: "1000000029",
        documentNumber: "FVS/2026/03/0001",
        netAmountGrosze: 100000,
        flag: "F",
        monthlyAmountsGrosze: new Map([["2026-03-01", 50000]]),
      },
      {
        sourceRowNumber: 2,
        nip: "2000000038",
        documentNumber: "FVZ/2026/02/0007",
        netAmountGrosze: 20000,
        flag: "G",
        monthlyAmountsGrosze: new Map([["2026-02-01", 20000]]),
      },
    ];
    const clientNames = new Map([
      ["1000000029", "Firma Testowa Sp. z o.o."],
      ["2000000038", "Druga Firma S.A."],
    ]);
    const months = ["2026-02-01", "2026-03-01", "2026-04-01"];

    const rows = buildSourceDataRows(items, clientNames, months);

    expect(rows.map((r) => r.lp)).toEqual([2, 5]);
    expect(rows[0].monthlyAmountsGrosze).toEqual([20000, 0, 0]);
    expect(rows[1].monthlyAmountsGrosze).toEqual([0, 50000, 0]);
  });

  it("pokazuje etykietę zastępczą, gdy NIP nie ma nazwy w słowniku", () => {
    const items: SourceItemFact[] = [
      {
        sourceRowNumber: 1,
        nip: "9999999999",
        documentNumber: "FVS/2026/01/0001",
        netAmountGrosze: 100,
        flag: "H",
        monthlyAmountsGrosze: new Map(),
      },
    ];

    const rows = buildSourceDataRows(items, new Map(), ["2026-01-01"]);

    expect(rows[0].clientName).toBe("(nieznana nazwa)");
    expect(rows[0].monthlyAmountsGrosze).toEqual([0]);
  });

  it("zachowuje flagę null (wers FKS)", () => {
    const items: SourceItemFact[] = [
      {
        sourceRowNumber: 1,
        nip: "1000000029",
        documentNumber: "FKS/2026/01/0001",
        netAmountGrosze: -100,
        flag: null,
        monthlyAmountsGrosze: new Map([["2026-01-01", -100]]),
      },
    ];

    const rows = buildSourceDataRows(items, new Map(), ["2026-01-01"]);

    expect(rows[0].flag).toBeNull();
  });
});

describe("sumSourceDataColumns", () => {
  it("sumuje wartość netto i każdą kolumnę miesięczną osobno", () => {
    const items: SourceItemFact[] = [
      {
        sourceRowNumber: 1,
        nip: "1000000029",
        documentNumber: "FVS/2026/02/0001",
        netAmountGrosze: 100000,
        flag: "F",
        monthlyAmountsGrosze: new Map([["2026-02-01", 50000], ["2026-03-01", 50000]]),
      },
      {
        sourceRowNumber: 2,
        nip: "2000000038",
        documentNumber: "FVZ/2026/02/0007",
        netAmountGrosze: 20000,
        flag: "G",
        monthlyAmountsGrosze: new Map([["2026-02-01", 20000]]),
      },
    ];
    const months = ["2026-02-01", "2026-03-01"];
    const rows = buildSourceDataRows(items, new Map(), months);

    const totals = sumSourceDataColumns(rows, months.length);

    expect(totals.netAmountGrosze).toBe(120000);
    expect(totals.monthlyTotalsGrosze).toEqual([70000, 50000]);
  });

  it("zwraca same zera dla pustej listy wersów", () => {
    const totals = sumSourceDataColumns([], 3);
    expect(totals.netAmountGrosze).toBe(0);
    expect(totals.monthlyTotalsGrosze).toEqual([0, 0, 0]);
  });
});
