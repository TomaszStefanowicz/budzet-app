import { describe, expect, it } from "vitest";
import { parseDecimalToGrosze } from "./parseDecimalToGrosze";

describe("parseDecimalToGrosze", () => {
  it("parsuje liczbę dodatnią", () => {
    expect(parseDecimalToGrosze(12.34)).toBe(1234);
  });

  it("parsuje liczbę ujemną (korekta FKS)", () => {
    expect(parseDecimalToGrosze(-12.34)).toBe(-1234);
  });

  it("parsuje zero", () => {
    expect(parseDecimalToGrosze(0)).toBe(0);
  });

  it("koryguje szum reprezentacji zmiennoprzecinkowej", () => {
    // 0.1 * 100 w JS daje 10.000000000000002 - toFixed(2) naprawia to przed rozbiciem
    expect(parseDecimalToGrosze(0.1)).toBe(10);
    expect(parseDecimalToGrosze(1200.5)).toBe(120050);
  });

  it("parsuje wejście jako string (na wypadek, gdyby supabase-js zwrócił numeric jako tekst)", () => {
    expect(parseDecimalToGrosze("12.34")).toBe(1234);
    expect(parseDecimalToGrosze("-1200.00")).toBe(-120000);
  });

  it("parsuje pełne złotówki bez reszty groszowej", () => {
    expect(parseDecimalToGrosze(1200)).toBe(120000);
  });
});
