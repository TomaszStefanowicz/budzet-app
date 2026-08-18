import { describe, expect, it } from "vitest";
import { buildExpiringContractsReport } from "./buildExpiringContractsReport";
import type { ItemMonthFact } from "./buildClientMonthlyRevenueReport";

describe("buildExpiringContractsReport", () => {
  it("wykazuje klienta z przychodem w M-1 i M, brakiem w M+1 - wartość i faktury z M-1", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // brak wersu dla 2026-04 - pakiet wygasł
    ];
    const result = buildExpiringContractsReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 100000,
        invoiceTotalGrosze: 600000,
        documentNumbers: ["FVS/2025/08/0001"],
      },
    ]);
  });

  it("nie wykazuje klienta, który ma przychód również w M+1 (pakiet nadal aktywny)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 1200000 },
      { nip: "1111111111", flag: "G", month: "2026-04-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 1200000 },
    ];
    expect(buildExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("nie wykazuje klienta, który przedłużył z opóźnieniem - przerwa dłuższa niż jeden miesiąc (decyzja V.43)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // brak 2026-04 (M+1) - przerwa w dostępie
      // przedłużenie dopiero od 2026-05 (M+2) - rozliczenie wg daty faktycznego dostępu, nie daty wystawienia faktury
      { nip: "1111111111", flag: "G", month: "2026-05-01", monthlyAmountGrosze: 90000, documentNumber: "FVS/2026/05/0009", invoiceNetAmountGrosze: 1080000 },
    ];
    // marzec (M) nie powinien już figurować jako "nieprzedłużony", bo klient przedłużył (choć z opóźnieniem)
    expect(buildExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("wykazuje klienta, który do końca dostępnych danych nigdy nie przedłużył (prawdziwe zaniechanie)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // inny klient przedłuża daleko w przyszłości, ale to nie powinno wpływać na 1111111111
      { nip: "2222222222", flag: "F", month: "2028-01-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2028/01/0001", invoiceNetAmountGrosze: 600000 },
    ];
    expect(buildExpiringContractsReport(facts, "2026-03-01")).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 100000,
        invoiceTotalGrosze: 600000,
        documentNumbers: ["FVS/2025/08/0001"],
      },
    ]);
  });

  it("nie wykazuje klienta, którego seria zaczyna się dokładnie w M (brak przychodu w M-1, SPEC.md 13.e)", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0001", invoiceNetAmountGrosze: 300000 },
      // brak 2026-02 i brak 2026-04
    ];
    expect(buildExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("wyklucza wersy z flagą I z testu kwalifikującego i z wartości (SPEC.md 11a, potwierdzone z użytkownikiem)", () => {
    const facts: ItemMonthFact[] = [
      // pakiet G wygasający - kwalifikuje klienta
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // niezwiązany zakup incydentalny w M-1 i M+1 - nie może ani dodać się do wartości, ani zamaskować wygaśnięcia
      { nip: "1111111111", flag: "I", month: "2026-02-01", monthlyAmountGrosze: 999999, documentNumber: "FVH/2026/02/0002", invoiceNetAmountGrosze: 999999 },
      { nip: "1111111111", flag: "I", month: "2026-04-01", monthlyAmountGrosze: 999999, documentNumber: "FVH/2026/04/0003", invoiceNetAmountGrosze: 999999 },
    ];
    const result = buildExpiringContractsReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 100000,
        invoiceTotalGrosze: 600000,
        documentNumbers: ["FVS/2025/08/0001"],
      },
    ]);
  });

  it("uwzględnia FKS (flaga null) w serii - korekta może zerować przychód i ukryć wygaśnięcie z widoku", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "H", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/02/0001", invoiceNetAmountGrosze: 100000 },
      { nip: "1111111111", flag: "H", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2026/03/0002", invoiceNetAmountGrosze: 100000 },
      { nip: "1111111111", flag: null, month: "2026-03-01", monthlyAmountGrosze: -100000, documentNumber: "FKS/2026/03/0003", invoiceNetAmountGrosze: -100000 },
    ];
    // przychód w M zerowany przez korektę -> klient nie ma przychodu > 0 w M, nie kwalifikuje się
    expect(buildExpiringContractsReport(facts, "2026-03-01")).toEqual([]);
  });

  it("nie miesza klientów i nie wykazuje tego, kto nie wygasa w danym miesiącu", () => {
    const facts: ItemMonthFact[] = [
      { nip: "1111111111", flag: "G", month: "2026-02-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      { nip: "1111111111", flag: "G", month: "2026-03-01", monthlyAmountGrosze: 100000, documentNumber: "FVS/2025/08/0001", invoiceNetAmountGrosze: 600000 },
      // klient 2222222222 ma przychód też w kwietniu (M+1) - pakiet wciąż aktywny, nie wygasa w marcu
      { nip: "2222222222", flag: "F", month: "2026-02-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/01/0009", invoiceNetAmountGrosze: 150000 },
      { nip: "2222222222", flag: "F", month: "2026-03-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/01/0009", invoiceNetAmountGrosze: 150000 },
      { nip: "2222222222", flag: "F", month: "2026-04-01", monthlyAmountGrosze: 50000, documentNumber: "FVS/2026/01/0009", invoiceNetAmountGrosze: 150000 },
    ];
    const result = buildExpiringContractsReport(facts, "2026-03-01");
    expect(result).toEqual([
      {
        nip: "1111111111",
        revenueGrosze: 100000,
        invoiceTotalGrosze: 600000,
        documentNumbers: ["FVS/2025/08/0001"],
      },
    ]);
  });
});
