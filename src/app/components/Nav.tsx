import Link from "next/link";
import { signOut } from "../actions";

type ActivePage = "import" | "reports" | "clients";

const LINKS: { href: string; label: string; key: ActivePage }[] = [
  { href: "/", label: "Import", key: "import" },
  { href: "/reports", label: "Zestawienia", key: "reports" },
  { href: "/clients", label: "Słownik klientów", key: "clients" },
];

export function Nav({ active, email }: { active: ActivePage; email?: string | null }) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center gap-4">
        {LINKS.map((link) =>
          link.key === active ? (
            <span key={link.key} className="text-sm font-medium text-gray-900">
              {link.label}
            </span>
          ) : (
            <Link
              key={link.key}
              href={link.href}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
            >
              {link.label}
            </Link>
          )
        )}
      </div>
      <div className="flex items-center gap-4">
        {email && <p className="text-xs text-gray-400">{email}</p>}
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
  );
}
