import { describe, expect, it } from "vitest";
import { buildAllExpiringContractsReport } from "./buildAllExpiringContractsReport";
import type { ItemMonthFact } from "./buildClientMonthlyRevenueReport";

describe("buildAllExpiringContractsReport", () => {
  it("wykazuje klienta z przychodem w M-1 i M, brakiem w M+1 - wartość i faktury z M-1", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 600000, documentNumbers: ["FVS/2025/08/0001"] },
    ]);
  });

  it("nie wykazuje klienta, który ma przychód również w M+1 z TEGO SAMEGO dokumentu (pakiet nadal aktywny)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "G", month: "2026-04-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 1200000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("wykazuje klienta, który przedłużył z opóźnieniem - różnica kluczowa względem zestawienia 13 (V.43 by go wykluczyło)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // brak 2026-04 (M+1) - przerwa w dostępie
      { nip: "1111111111", flag: "G", month: "2026-05-01", monthlyAmountGrosze: 90000, documentNumber: "FVS/2026/05/0009", invoiceNetAmountGrosze: 1080000 },
    ];
    // umowa z sierpnia 2025 wygasła w marcu, mimo że klient później przedłużył - 17 pokazuje ją mimo to
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 600000, documentNumbers: ["FVS/2025/08/0001"] },
    ]);
  });

  it("wykazuje bezszwowe przedłużenie - nowy dokument zaczyna przychód dokładnie w M+1 (przypadek nieuchwytny agregatem klienta)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // nowa, osobna umowa startuje natychmiast w kwietniu (M+1) - suma przychodów klienta nigdy nie spada do zera
      { nip: "1111111111", flag: "G", month: "2026-04-01", monthlyAmountGrosze: 95000, documentNumber: "FVS/2026/04/0010", invoiceNetAmountGrosze: 1140000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 600000, documentNumbers: ["FVS/2025/08/0001"] },
    ]);
  });

  it("nie wykazuje klienta, którego przychód w M jest wyzerowany korektą (FKS na innym numerze dokumentu) - decyzja V.8, mimo że dokument F/G sam w sobie wygląda na wygasający", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/02/0001", invoiceNetAmountGrosze: 100000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0002", invoiceNetAmountGrosze: 100000 },
      { nip: "1111111111", flag: null, month: "2026-03-01", monthlyAmountGrosze: -100000, documentNumber: "FKS/2026/03/0003", invoiceNetAmountGrosze: -100000 },
    ];
    // dokument FVS/2026/03/0002 sam w sobie wygląda na wygasający, ale agregat NIP w marcu to 0 po korekcie
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("wykazuje klienta rozliczanego cyklicznie co miesiąc osobnym dokumentem z flagą G (wyjątek MiŚOT, decyzja V.44) - dokument bez własnego przychodu w M-1 kwalifikuje się, ale z zerową wartością do utraty (nic nie ma do stracenia z TEGO dokumentu)", () => {
    const facts: ItemMonthFact[] = [
      // inny dokument tego samego klienta w lutym - zapewnia dodatni agregat NIP w M-1, ale to nie ta sama umowa
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/02/0001", invoiceNetAmountGrosze: 50000 },
      // nowy, osobny dokument (flaga G, jak MiŚOT) obejmuje wyłącznie marzec (M) - kończy się w tym samym miesiącu, w którym się zaczyna
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 20000, documentNumber: "FVS/2026/03/0009", invoiceNetAmountGrosze: 20000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 0, invoiceTotalGrosze: 0, documentNumbers: [] },
    ]);
  });

  it("nie wykazuje samodzielnego jednomiesięcznego dokupienia (flaga H, dozwolone bez ograniczenia liczby miesięcy - decyzja V.27) jako wygasającej umowy", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/02/0001", invoiceNetAmountGrosze: 50000 },
      // dokupienie tylko w marcu, brak w kwietniu - nie jest dostępem podlegającym wygaśnięciu/przedłużeniu
      { nip: "1111111111", flag: "H", month: "2026-03-01", monthlyAmountGrosze: 20000, documentNumber: "FVS/2026/03/0009", invoiceNetAmountGrosze: 20000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("wyklucza wersy z flagą I z testu kwalifikującego i z wartości (SPEC.md 11a, jak w zestawieniu 13)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "I", month: "2026-02-01", monthlyAmountGrosze: 999999, documentNumber: "FVH/2026/02/0002", invoiceNetAmountGrosze: 999999 },
      { nip: "1111111111", flag: "I", month: "2026-04-01", monthlyAmountGrosze: 999999, documentNumber: "FVH/2026/04/0003", invoiceNetAmountGrosze: 999999 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 600000, documentNumbers: ["FVS/2025/08/0001"] },
    ]);
  });

  it("sumuje wartości, gdy ten sam klient ma dwa dokumenty (F/G) wygasające w tym samym miesiącu", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/A", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/A", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "F", month: "2026-02-01", monthlyAmountGrosze: 20000, documentNumber: "FVS/B", invoiceNetAmountGrosze: 40000 },
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 20000, documentNumber: "FVS/B", invoiceNetAmountGrosze: 40000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 120000, invoiceTotalGrosze: 640000, documentNumbers: expect.arrayContaining(["FVS/A", "FVS/B"]) },
    ]);
  });

  it("nie miesza klientów i nie wykazuje tego, kto nie wygasa w danym miesiącu", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "2222222222", flag: "F", month: "2026-02-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/01/0009", invoiceNetAmountGrosze: 150000 },
      { nip: "2222222222", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/01/0009", invoiceNetAmountGrosze: 150000 },
      { nip: "2222222222", flag: "F", month: "2026-04-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/01/0009", invoiceNetAmountGrosze: 150000 },
    ];
    expect(buildAllExpiringContractsReport(facts, "2026-03-01")).toEqual([
      { nip: "1111111111", revenueGrosze: 100000, invoiceTotalGrosze: 600000, documentNumbers: ["FVS/2025/08/0001"] },
    ]);
  });
});
