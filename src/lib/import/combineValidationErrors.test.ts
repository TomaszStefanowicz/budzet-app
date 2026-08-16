import { describe, expect, it } from "vitest";
import { combineValidationErrors } from "./combineValidationErrors";

describe("combineValidationErrors", () => {
  it("sortuje błędy z wielu walidatorów rosnąco po numerze wersu (SPEC.md V.32)", () => {
    const fromStructure = [
      { sourceRowNumber: 5, message: "błąd struktury wers 5" },
      { sourceRowNumber: 2, message: "błąd struktury wers 2" },
    ];
    const fromFlagRules = [{ sourceRowNumber: 3, message: "błąd flagi wers 3" }];

    const combined = combineValidationErrors(fromStructure, fromFlagRules);

    expect(combined.map((e) => e.sourceRowNumber)).toEqual([2, 3, 5]);
  });

  it("zachowuje kolejność walidatorów dla błędów tego samego wersu (sort stabilny)", () => {
    const fromStructure = [{ sourceRowNumber: 4, message: "ze struktury" }];
    const fromFlagRules = [{ sourceRowNumber: 4, message: "z reguł flag" }];

    const combined = combineValidationErrors(fromStructure, fromFlagRules);

    expect(combined.map((e) => e.message)).toEqual(["ze struktury", "z reguł flag"]);
  });

  it("zwraca pustą listę, gdy żaden walidator nie zgłosił błędu", () => {
    expect(combineValidationErrors([], [], [])).toEqual([]);
  });
});
