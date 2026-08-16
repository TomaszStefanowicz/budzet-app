import type { StructuralValidationError } from "./validateStructure";

/**
 * Łączy błędy z niezależnych walidatorów w jedną listę posortowaną rosnąco
 * po numerze wersu (SPEC.md V.32) - każdy walidator zwraca błędy w kolejności
 * wersów, ale konkatenacja sama w sobie miesza kolejność między walidatorami.
 * Sort jest stabilny (gwarancja ECMAScript), więc błędy tego samego wersu
 * zachowują kolejność walidatorów przekazaną na wejściu.
 */
export function combineValidationErrors(
  ...errorLists: StructuralValidationError[][]
): StructuralValidationError[] {
  return errorLists.flat().sort((a, b) => a.sourceRowNumber - b.sourceRowNumber);
}
