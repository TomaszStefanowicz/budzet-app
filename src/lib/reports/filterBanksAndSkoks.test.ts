import { describe, expect, it } from "vitest";
import { filterBanksAndSkoks } from "./filterBanksAndSkoks";
import type { ClientRevenueReportRow } from "./buildClientMonthlyRevenueReport";

function row(nip: string): ClientRevenueReportRow {
  return { nip, revenueGrosze: 1000, invoiceTotalGrosze: 1000, documentNumbers: [`F/2026/01/000${nip.slice(-1)}`] };
}

describe("filterBanksAndSkoks", () => {
  it("zwraca tylko klientów z typem bank lub SKOK, pomija inne typy", () => {
    const clientTypes = new Map([
      ["1111111111", "bank"],
      ["2222222222", "SKOK"],
      ["3333333333", "inny"],
      ["4444444444", "nieokreślony"],
    ]);
    const rows = ["1111111111", "2222222222", "3333333333", "4444444444"].map(row);
    const result = filterBanksAndSkoks(rows, clientTypes);
    expect(result.map((r) => r.nip)).toEqual(["1111111111", "2222222222"]);
  });

  it("pomija NIP-y bez wpisu w słowniku", () => {
    const clientTypes = new Map([["1111111111", "bank"]]);
    const rows = ["1111111111", "9999999999"].map(row);
    expect(filterBanksAndSkoks(rows, clientTypes).map((r) => r.nip)).toEqual(["1111111111"]);
  });

  it("zwraca pustą listę, gdy brak wierszy", () => {
    expect(filterBanksAndSkoks([], new Map())).toEqual([]);
  });

  it("zwraca pustą listę, gdy żaden klient nie jest bankiem ani SKOK-iem", () => {
    const clientTypes = new Map([
      ["1111111111", "inny"],
      ["2222222222", "nieokreślony"],
    ]);
    const rows = ["1111111111", "2222222222"].map(row);
    expect(filterBanksAndSkoks(rows, clientTypes)).toEqual([]);
  });
});
