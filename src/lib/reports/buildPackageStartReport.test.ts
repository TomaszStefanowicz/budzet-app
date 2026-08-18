import { describe, expect, it } from "vitest";
import { buildPackageStartReport } from "./buildPackageStartReport";
import type { ItemMonthFact } from "./buildClientMonthlyRevenueReport";

describe("buildPackageStartReport", () => {
  it("wykazuje klienta, którego pakiet F zaczyna się w M - wartość i faktury z M+1", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "F", month: "2026-04-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
    ];
    const result = buildPackageStartReport(facts, "F", "2026-03-01");
    expect(result).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 1200000, documentNumbers: ["FVS/2026/03/0001"] },
    ]);
  });

  it("działa analogicznie dla flagi G (zestawienie 15)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/03/0005", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-04-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/03/0005", invoiceNetAmountGrosze: 600000 },
    ];
    expect(buildPackageStartReport(facts, "G", "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 50000, invoiceTotalGrosze: 600000, documentNumbers: ["FVS/2026/03/0005"] },
    ]);
  });

  it("nie wykazuje klienta, którego pakiet zaczął się w innym miesiącu", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "F", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/02/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/02/0001", invoiceNetAmountGrosze: 1200000 },
    ];
    expect(buildPackageStartReport(facts, "F", "2026-03-01")).toEqual([]);
  });

  it("nie zależy od długości ewentualnej przerwy przed pakietem - liczy się flaga, nie agregat M-1 (decyzja V.44)", () => {
    const facts: ItemMonthFact[] = [
      // dawny, niezwiązany zakup incydentalny klienta - nie wpływa na klasyfikację "nowy od marca"
      { nip: "1111111111", flag: "I", month: "2024-01-01", monthlyAmountGrosze: 500000, documentNumber: "FVH/2024/01/0001", invoiceNetAmountGrosze: 500000 },
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "F", month: "2026-04-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
    ];
    expect(buildPackageStartReport(facts, "F", "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 1200000, documentNumbers: ["FVS/2026/03/0001"] },
    ]);
  });

  it("wykazuje klienta z zerową wartością, gdy pakiet jednomiesięczny nie ma kontynuacji w M+1", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 100000 },
      // brak jakiejkolwiek kontynuacji w kwietniu
    ];
    expect(buildPackageStartReport(facts, "F", "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 0, invoiceTotalGrosze: 0, documentNumbers: [] },
    ]);
  });

  it("wartość w M+1 sumuje całą serię klienta, nie tylko wers z flagą wywołującą", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "F", month: "2026-04-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
      // dokupienie (H) w tym samym miesiącu startu pakietu podstawowego
      { nip: "1111111111", flag: "H", month: "2026-04-01", monthlyAmountGrosze: 20000, documentNumber: "FVS/2026/04/0002", invoiceNetAmountGrosze: 20000 },
    ];
    expect(buildPackageStartReport(facts, "F", "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 120000, invoiceTotalGrosze: 1220000, documentNumbers: ["FVS/2026/03/0001", "FVS/2026/04/0002"] },
    ]);
  });

  it("nie miesza klientów i nie wykazuje przedłużeń (G) w zestawieniu nowych klientów (F)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "F", month: "2026-04-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "2222222222", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/03/0009", invoiceNetAmountGrosze: 600000 },
      { nip: "2222222222", flag: "G", month: "2026-04-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/03/0009", invoiceNetAmountGrosze: 600000 },
    ];
    expect(buildPackageStartReport(facts, "F", "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 1200000, documentNumbers: ["FVS/2026/03/0001"] },
    ]);
  });
});
