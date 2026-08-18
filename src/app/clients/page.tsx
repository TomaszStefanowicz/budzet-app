import Link from "next/link";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { ClientTypeSelect } from "./ClientTypeSelect";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = createServiceRoleSupabaseClient();
  const { data: clients, error } = await supabase
    .from("clients")
    .select("nip, name, previous_name, type")
    .order("name");

  const unresolvedCount = clients?.filter((c) => c.type === "nieokreślony").length ?? 0;

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <div className="w-full max-w-3xl">
        <Link href="/" className="text-sm text-gray-600 hover:underline">
          ← Powrót do importu
        </Link>
      </div>

      <div className="w-full max-w-3xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-gray-900">Słownik klientów</h1>

        {unresolvedCount > 0 && (
          <p className="mb-4 text-sm text-amber-700">
            {unresolvedCount} {unresolvedCount === 1 ? "klient" : "klientów"} bez uzupełnionego typu — uzupełnij
            poniżej.
          </p>
        )}

        {error && <p className="text-sm text-red-600">Błąd pobierania danych: {error.message}</p>}

        {!error && clients?.length === 0 && <p className="text-sm text-gray-500">Brak klientów.</p>}

        {!error && clients && clients.length > 0 && (
          <div className="max-h-[70vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="sticky top-0 z-10 border-b border-gray-200 bg-white text-gray-500">
                  <th className="py-2 font-medium">NIP</th>
                  <th className="py-2 font-medium">Nazwa</th>
                  <th className="py-2 font-medium">Typ</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr
                    key={c.nip}
                    className={`border-b border-gray-100 ${c.type === "nieokreślony" ? "bg-amber-50" : "even:bg-gray-50"}`}
                  >
                    <td className="py-2">{c.nip}</td>
                    <td className="py-2">
                      {c.name}
                      {c.previous_name && (
                        <span className="ml-1 text-xs text-gray-400">(dawniej: {c.previous_name})</span>
                      )}
                    </td>
                    <td className="py-2">
                      <ClientTypeSelect nip={c.nip} type={c.type} />
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
