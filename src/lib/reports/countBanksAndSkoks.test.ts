import { describe, expect, it } from "vitest";
import { countBanksAndSkoks } from "./countBanksAndSkoks";

describe("countBanksAndSkoks", () => {
  it("liczy klientów z typem bank lub SKOK, pomija inne typy", () => {
    const clientTypes = new Map([
      ["1111111111", "bank"],
      ["2222222222", "SKOK"],
      ["3333333333", "inny"],
      ["4444444444", "nieokreślony"],
    ]);
    const count = countBanksAndSkoks(["1111111111", "2222222222", "3333333333", "4444444444"], clientTypes);
    expect(count).toBe(2);
  });

  it("pomija NIP-y bez wpisu w słowniku", () => {
    const clientTypes = new Map([["1111111111", "bank"]]);
    expect(countBanksAndSkoks(["1111111111", "9999999999"], clientTypes)).toBe(1);
  });

  it("zwraca 0 dla pustej listy NIP-ów", () => {
    expect(countBanksAndSkoks([], new Map())).toBe(0);
  });

  it("zwraca 0, gdy żaden klient nie jest bankiem ani SKOK-iem", () => {
    const clientTypes = new Map([
      ["1111111111", "inny"],
      ["2222222222", "nieokreślony"],
    ]);
    expect(countBanksAndSkoks(["1111111111", "2222222222"], clientTypes)).toBe(0);
  });
});
