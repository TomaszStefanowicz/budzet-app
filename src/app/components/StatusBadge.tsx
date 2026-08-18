export function StatusBadge({ status }: { status: "sukces" | "błąd" }) {
  const isSuccess = status === "sukces";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isSuccess ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
    >
      {status}
    </span>
  );
}
