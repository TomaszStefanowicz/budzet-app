import { describe, expect, it } from "vitest";
import { planClientDictionaryUpdates } from "./planClientDictionaryUpdates";

describe("planClientDictionaryUpdates", () => {
  it("nowy NIP trafia do toInsert", () => {
    const plan = planClientDictionaryUpdates([{ nip: "1111111111", name: "Firma A" }], []);
    expect(plan.toInsert).toEqual([{ nip: "1111111111", name: "Firma A" }]);
    expect(plan.toUpdate).toEqual([]);
  });

  it("istniejący klient z tą samą nazwą nie trafia nigdzie", () => {
    const plan = planClientDictionaryUpdates(
      [{ nip: "1111111111", name: "Firma A" }],
      [{ nip: "1111111111", name: "Firma A" }]
    );
    expect(plan.toInsert).toEqual([]);
    expect(plan.toUpdate).toEqual([]);
  });

  it("istniejący klient z inną nazwą trafia do toUpdate z poprawnym previousName", () => {
    const plan = planClientDictionaryUpdates(
      [{ nip: "1111111111", name: "Firma A - Nowa Nazwa" }],
      [{ nip: "1111111111", name: "Firma A" }]
    );
    expect(plan.toInsert).toEqual([]);
    expect(plan.toUpdate).toEqual([
      { nip: "1111111111", name: "Firma A - Nowa Nazwa", previousName: "Firma A" },
    ]);
  });

  it("kilka wystąpień tego samego NIP w pliku - bierze nazwę z ostatniego wersu", () => {
    const plan = planClientDictionaryUpdates(
      [
        { nip: "1111111111", name: "Firma A" },
        { nip: "1111111111", name: "Firma A - Nowa Nazwa" },
      ],
      []
    );
    expect(plan.toInsert).toEqual([{ nip: "1111111111", name: "Firma A - Nowa Nazwa" }]);
  });

  it("nie zgłasza nic dla klientów z bazy, których NIP nie występuje w pliku", () => {
    const plan = planClientDictionaryUpdates(
      [{ nip: "1111111111", name: "Firma A" }],
      [{ nip: "2222222222", name: "Firma B" }]
    );
    expect(plan.toInsert).toEqual([{ nip: "1111111111", name: "Firma A" }]);
    expect(plan.toUpdate).toEqual([]);
  });
});
