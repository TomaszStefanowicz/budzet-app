import { NextResponse } from "next/server";
import { parseWorkbookBuffer } from "@/lib/import/parseWorkbook";
import { parseSalesRows } from "@/lib/import/parseSalesRows";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nie przesłano pliku." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const rawRows = parseWorkbookBuffer(buffer);
  const { rows, monthRange } = parseSalesRows(rawRows);

  return NextResponse.json({
    fileName: file.name,
    rowCount: rows.length,
    monthRange,
  });
}
