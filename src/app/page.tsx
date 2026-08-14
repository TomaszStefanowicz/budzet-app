import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 px-4">
      <p className="text-gray-700">
        Zalogowano jako <span className="font-medium">{user?.email}</span>
      </p>
      <form action={signOut}>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Wyloguj
        </button>
      </form>
    </div>
  );
}
