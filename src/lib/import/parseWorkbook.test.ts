import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { parseWorkbookBuffer } from "./parseWorkbook";
import { parseSalesRows } from "./parseSalesRows";

describe("parseWorkbookBuffer + parseSalesRows (integracja na pliku syntetycznym)", () => {
  it("odczytuje test-data/dane-syntetyczne-clean.xlsx zgodnie z manifestem", () => {
    const filePath = path.join(process.cwd(), "test-data", "dane-syntetyczne-clean.xlsx");
    const manifestPath = path.join(process.cwd(), "test-data", "dane-syntetyczne-clean.manifest.json");

    const buffer = readFileSync(filePath);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

    const rawRows = parseWorkbookBuffer(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
    const { rows, monthRange } = parseSalesRows(rawRows);

    expect(rows).toHaveLength(manifest.liczbaWersow);
    expect(monthRange).toEqual({ fromYear: 2024, fromMonth: 1, toYear: 2027, toMonth: 12 });
  });
});
