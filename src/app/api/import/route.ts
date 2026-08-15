import { NextResponse } from "next/server";
import { parseWorkbookBuffer } from "@/lib/import/parseWorkbook";
import { parseSalesRows } from "@/lib/import/parseSalesRows";
import { validateFileStructure } from "@/lib/import/validateStructure";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nie przesłano pliku." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "Plik musi być w formacie .xlsx (SPEC.md II.4)." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const rawRows = parseWorkbookBuffer(buffer);

  const structuralErrors = validateFileStructure(rawRows);
  if (structuralErrors.length > 0) {
    return NextResponse.json({ fileName: file.name, errors: structuralErrors }, { status: 422 });
  }

  const { rows, monthRange } = parseSalesRows(rawRows);

  return NextResponse.json({
    fileName: file.name,
    rowCount: rows.length,
    monthRange,
  });
}
