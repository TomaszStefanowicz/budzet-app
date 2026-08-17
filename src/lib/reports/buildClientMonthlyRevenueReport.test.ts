import { describe, expect, it } from "vitest";
import { buildClientMonthlyRevenueReport } from "./buildClientMonthlyRevenueReport";
import type { ItemMonthFact } from "./buildClientMonthlyRevenueReport";

describe("buildClientMonthlyRevenueReport", () => {
  it("buduje pozycję dla klienta z jedną fakturą", () => {
    const facts: ItemMonthFact[] = [
      {
        nip: "1111111111",
        flag: "F",
        month: "2026-03-01",
        monthlyAmountGrosze: 100000,
        documentNumber: "FVS/2026/01/0001",
        invoiceNetAmountGrosze: 1200000,
      },
    ];
    const result = buildClientMonthlyRevenueReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 100000,
        invoiceTotalGrosze: 1200000,
        documentNumbers: ["FVS/2026/01/0001"],
      },
    ]);
  });

  it("rozróżnia przychód miesiąca od sumy wartości faktur - dwie faktury dotykające tego samego miesiąca", () => {
    const facts: ItemMonthFact[] = [
      {
        nip: "1111111111",
        flag: "F",
        month: "2026-03-01",
        monthlyAmountGrosze: 100000,
        documentNumber: "FVS/2026/01/0001",
        invoiceNetAmountGrosze: 1200000, // pakiet 12-miesięczny, całość faktury
      },
      {
        nip: "1111111111",
        flag: "I",
        month: "2026-03-01",
        monthlyAmountGrosze: 50000,
        documentNumber: "FVH/2026/03/0002",
        invoiceNetAmountGrosze: 50000, // pakiet jednomiesięczny
      },
    ];
    const result = buildClientMonthlyRevenueReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 150000, // 100000 + 50000
        invoiceTotalGrosze: 1250000, // 1200000 + 50000 - PEŁNA wartość obu faktur
        documentNumbers: ["FVS/2026/01/0001", "FVH/2026/03/0002"],
      },
    ]);
  });

  it("pomija klienta z zagregowanym przychodem <= 0 mimo obecności w danych wejściowych (SPEC.md 11a)", () => {
    const facts: ItemMonthFact[] = [
      {
        nip: "1111111111",
        flag: "F",
        month: "2026-03-01",
        monthlyAmountGrosze: 100000,
        documentNumber: "FVS/2026/01/0001",
        invoiceNetAmountGrosze: 100000,
      },
      {
        nip: "1111111111",
        flag: null,
        month: "2026-03-01",
        monthlyAmountGrosze: -100000, // korekta zerująca miesiąc
        documentNumber: "FKS/2026/03/0002",
        invoiceNetAmountGrosze: -100000,
      },
    ];
    expect(buildClientMonthlyRevenueReport(facts, "2026-03-01")).toEqual([]);
  });

  it("wlicza korektę FKS tak jak każdy inny wers, bez wykluczania (SPEC.md 11a)", () => {
    const facts: ItemMonthFact[] = [
      {
        nip: "1111111111",
        flag: "F",
        month: "2026-03-01",
        monthlyAmountGrosze: 200000,
        documentNumber: "FVS/2026/01/0001",
        invoiceNetAmountGrosze: 2400000,
      },
      {
        nip: "1111111111",
        flag: null,
        month: "2026-03-01",
        monthlyAmountGrosze: -50000,
        documentNumber: "FKS/2026/03/0002",
        invoiceNetAmountGrosze: -50000,
      },
    ];
    const result = buildClientMonthlyRevenueReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 150000,
        invoiceTotalGrosze: 2350000,
        documentNumbers: ["FVS/2026/01/0001", "FKS/2026/03/0002"],
      },
    ]);
  });

  it("nie miesza różnych miesięcy ani klientów", () => {
    const facts: ItemMonthFact[] = [
      {
        nip: "1111111111",
        flag: "F",
        month: "2026-02-01",
        monthlyAmountGrosze: 100000,
        documentNumber: "FVS/2026/02/0001",
        invoiceNetAmountGrosze: 100000,
      },
      {
        nip: "2222222222",
        flag: "G",
        month: "2026-03-01",
        monthlyAmountGrosze: 200000,
        documentNumber: "FVS/2026/03/0002",
        invoiceNetAmountGrosze: 200000,
      },
    ];
    const result = buildClientMonthlyRevenueReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "2222222222",
        revenueGrosze: 200000,
        invoiceTotalGrosze: 200000,
        documentNumbers: ["FVS/2026/03/0002"],
      },
    ]);
  });
});
