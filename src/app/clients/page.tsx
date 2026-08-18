import Link from "next/link";
import { createServiceRoleSupabaseClient } from "@/lib/supabase/service-role";
import { ClientsTable } from "./ClientsTable";

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

        {!error && clients && clients.length > 0 && <ClientsTable clients={clients} />}
      </div>
    </div>
  );
}
