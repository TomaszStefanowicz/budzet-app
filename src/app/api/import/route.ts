import { NextResponse } from "next/server";
import { parseWorkbookBuffer } from "@/lib/import/parseWorkbook";
import { parseSalesRows } from "@/lib/import/parseSalesRows";
import { validateFileStructure } from "@/lib/import/validateStructure";
import { validateDocumentAndFlagRules } from "@/lib/import/validateFlagRules";
import { validateFlagContinuity } from "@/lib/import/validateFlagContinuity";
import { combineValidationErrors } from "@/lib/import/combineValidationErrors";
import { planClientDictionaryUpdates } from "@/lib/import/planClientDictionaryUpdates";
import { formatMonthDate } from "@/lib/import/formatMonthDate";
import { buildRevenueItemRow } from "@/lib/import/buildRevenueItemRow";
import { buildRevenueMonthRows } from "@/lib/import/buildRevenueMonthRows";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";

const DB_INSERT_CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

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
  const supabase = createServiceRoleSupabaseClient();

  const errors = combineValidationErrors(
    validateFileStructure(rawRows),
    validateDocumentAndFlagRules(rawRows),
    validateFlagContinuity(rawRows)
  );
  if (errors.length > 0) {
    const { error: logError } = await supabase.from("imports").insert({
      file_name: file.name,
      row_count: Math.max(0, rawRows.length - 1),
      validation_status: "blad",
    });
    if (logError) {
      console.error("Nie udało się zapisać nieudanego importu do imports:", logError.message);
    }
    return NextResponse.json({ fileName: file.name, errors }, { status: 422 });
  }

  const { rows, monthRange } = parseSalesRows(rawRows);

  const fileClients = rows.map((r) => ({ nip: r.nip, name: r.clientName }));
  const distinctNips = Array.from(new Set(fileClients.map((c) => c.nip)));

  const { data: existingClients, error: fetchError } = await supabase
    .from("clients")
    .select("nip, name")
    .in("nip", distinctNips);

  if (fetchError) {
    return NextResponse.json({ error: `Błąd odczytu słownika klientów: ${fetchError.message}` }, { status: 500 });
  }

  const plan = planClientDictionaryUpdates(fileClients, existingClients ?? []);

  if (plan.toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("clients")
      .insert(plan.toInsert.map((c) => ({ nip: c.nip, name: c.name, type: "nieokreślony" })));
    if (insertError) {
      return NextResponse.json(
        { error: `Błąd zapisu nowych klientów do słownika: ${insertError.message}` },
        { status: 500 }
      );
    }
  }

  for (const update of plan.toUpdate) {
    const { error: updateError } = await supabase
      .from("clients")
      .update({ name: update.name, previous_name: update.previousName })
      .eq("nip", update.nip);
    if (updateError) {
      return NextResponse.json(
        { error: `Błąd aktualizacji nazwy klienta w słowniku: ${updateError.message}` },
        { status: 500 }
      );
    }
  }

  const { data: importRow, error: importLogError } = await supabase
    .from("imports")
    .insert({
      file_name: file.name,
      row_count: rows.length,
      validation_status: "sukces",
      detected_month_from: monthRange
        ? formatMonthDate({ year: monthRange.fromYear, month: monthRange.fromMonth })
        : null,
      detected_month_to: monthRange ? formatMonthDate({ year: monthRange.toYear, month: monthRange.toMonth }) : null,
    })
    .select("id")
    .single();
  if (importLogError || !importRow) {
    return NextResponse.json(
      { error: `Błąd zapisu metryk importu: ${importLogError?.message ?? "brak danych"}` },
      { status: 500 }
    );
  }
  const importId: number = importRow.id;

  // Import całościowy: wygaszamy poprzednie pozycje PRZED wstawieniem nowych
  // (zasada twarda projektu + ustalona kolejność operacji, SPEC.md IV.5).
  const { error: deactivateError } = await supabase
    .from("revenue_items")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateError) {
    return NextResponse.json(
      { error: `Błąd wygaszenia poprzednich pozycji rozliczeniowych: ${deactivateError.message}` },
      { status: 500 }
    );
  }

  const idBySourceRowNumber = new Map<number, number>();
  for (const batch of chunk(rows, DB_INSERT_CHUNK_SIZE)) {
    const { data: insertedItems, error: itemsError } = await supabase
      .from("revenue_items")
      .insert(batch.map((row) => buildRevenueItemRow(row, importId)))
      .select("id, source_row_number");
    if (itemsError || !insertedItems) {
      return NextResponse.json(
        { error: `Błąd zapisu pozycji rozliczeniowych: ${itemsError?.message ?? "brak danych"}` },
        { status: 500 }
      );
    }
    for (const item of insertedItems) {
      idBySourceRowNumber.set(item.source_row_number, item.id);
    }
  }

  const monthRows = rows.flatMap((row) => {
    const revenueItemId = idBySourceRowNumber.get(row.sourceRowNumber);
    if (revenueItemId === undefined) {
      throw new Error(`Brak zapisanej pozycji rozliczeniowej dla wersu ${row.sourceRowNumber}.`);
    }
    return buildRevenueMonthRows(row, revenueItemId);
  });

  for (const batch of chunk(monthRows, DB_INSERT_CHUNK_SIZE)) {
    const { error: monthsError } = await supabase.from("revenue_months").insert(batch);
    if (monthsError) {
      return NextResponse.json(
        { error: `Błąd zapisu przychodów miesięcznych: ${monthsError.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    fileName: file.name,
    rowCount: rows.length,
    monthRange,
  });
}
