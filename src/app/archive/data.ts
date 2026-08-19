import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import type { ArchivedPayload } from "@/lib/reports/archivedPayload";

export interface ArchiveSnapshotSummary {
  id: number;
  month: string;
  generatedAt: string;
}

/** Lista migawek do selektora, od najnowszej. */
export async function loadArchiveSnapshots(): Promise<ArchiveSnapshotSummary[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("report_archive")
    .select("id, month, generated_at")
    .order("generated_at", { ascending: false });

  if (error) {
    throw new Error(`Błąd odczytu archiwum: ${error.message}`);
  }

  return (data ?? []).map((row) => ({ id: row.id, month: row.month, generatedAt: row.generated_at }));
}

/** Pełny payload jednej migawki. */
export async function loadArchiveSnapshotPayload(id: number): Promise<ArchivedPayload> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase.from("report_archive").select("payload").eq("id", id).single();

  if (error || !data) {
    throw new Error(`Błąd odczytu migawki: ${error?.message ?? "brak danych"}`);
  }

  return data.payload as ArchivedPayload;
}
