import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { signOut } from "./actions";
import { UploadForm } from "./UploadForm";

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
      <div className="flex w-full max-w-3xl items-center justify-between">
        <p className="text-gray-700">
          Zalogowano jako <span className="font-medium">{user?.email}</span>
        </p>
        <div className="flex items-center gap-4">
          <Link href="/reports" className="text-sm text-gray-600 hover:underline">
            Zestawienia
          </Link>
          <Link href="/clients" className="text-sm text-gray-600 hover:underline">
            Słownik klientów
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Wyloguj
            </button>
          </form>
        </div>
      </div>

      <UploadForm />

      <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold text-gray-900">Historia importów</h1>

        {error && (
          <p className="text-sm text-red-600">
            Błąd pobierania danych: {error.message}
          </p>
        )}

        {!error && imports?.length === 0 && (
          <p className="text-sm text-gray-500">Brak importów.</p>
        )}

        {!error && imports && imports.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 font-medium">Data importu</th>
                <th className="py-2 font-medium">Plik</th>
                <th className="py-2 font-medium">Liczba wersów</th>
                <th className="py-2 font-medium">Zakres miesięcy</th>
                <th className="py-2 font-medium">Wynik</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((row) => (
                <tr key={row.id} className="border-b border-gray-100">
                  <td className="py-2">
                    {new Date(row.imported_at).toLocaleString("pl-PL")}
                  </td>
                  <td className="py-2">{row.file_name}</td>
                  <td className="py-2">{row.row_count}</td>
                  <td className="py-2">{formatMonthRange(row.detected_month_from, row.detected_month_to)}</td>
                  <td className="py-2">
                    {row.validation_status === "sukces" ? "sukces" : "błąd"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
