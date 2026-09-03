import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { UploadForm } from "./UploadForm";
import { StatusBadge } from "./components/StatusBadge";
import { Nav } from "./components/Nav";

function formatImportedAt(isoString: string): string {
  return new Date(isoString).toLocaleString("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatMonthRange(from: string | null, to: string | null): string {
  if (!from || !to) return "—";
  const toYearMonth = (date: string) => date.slice(0, 7).replace("-", "/");
  return `${toYearMonth(from)} – ${toYearMonth(to)}`;
}

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const serviceRoleClient = createServiceRoleSupabaseClient();
  const { data: imports, error } = await serviceRoleClient
    .from("imports")
    .select("id, imported_at, file_name, row_count, validation_status, detected_month_from, detected_month_to")
    .order("imported_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <div className="w-full max-w-3xl">
        <Nav active="import" email={user?.email} />
      </div>

      <UploadForm />

      <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="mb-4 text-xl font-bold text-gray-900">Historia importów</h1>

        {error && (
          <p className="text-sm text-red-600">
            Błąd pobierania danych: {error.message}
          </p>
        )}

        {!error && imports?.length === 0 && (
          <p className="text-sm text-gray-500">Brak importów.</p>
        )}

        {!error && imports && imports.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-gray-200 bg-white text-gray-500">
                  <th className="py-2 font-medium">Data importu</th>
                  <th className="py-2 font-medium">Plik</th>
                  <th className="py-2 text-center font-medium">Liczba wersów</th>
                  <th className="py-2 text-center font-medium">Zakres miesięcy</th>
                  <th className="py-2 text-center font-medium">Wynik</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 even:bg-gray-50">
                    <td className="py-2">{formatImportedAt(row.imported_at)}</td>
                    <td className="py-2">{row.file_name}</td>
                    <td className="py-2 text-center">{row.row_count}</td>
                    <td className="py-2 text-center">{formatMonthRange(row.detected_month_from, row.detected_month_to)}</td>
                    <td className="py-2 text-center">
                      <StatusBadge status={row.validation_status === "sukces" ? "sukces" : "błąd"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
