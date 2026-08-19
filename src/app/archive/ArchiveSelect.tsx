"use client";

import { useRouter } from "next/navigation";
import type { ArchiveSnapshotSummary } from "./data";

function optionLabel(snapshot: ArchiveSnapshotSummary): string {
  const month = snapshot.month.slice(0, 7).replace("-", "/");
  const generatedAt = new Date(snapshot.generatedAt).toLocaleString("pl-PL");
  return `${month} — zapisano ${generatedAt}`;
}

export function ArchiveSelect({
  snapshots,
  selectedId,
}: {
  snapshots: ArchiveSnapshotSummary[];
  selectedId: number;
}) {
  const router = useRouter();

  return (
    <select
      value={selectedId}
      onChange={(event) => router.push(`/archive?id=${event.target.value}`)}
      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
    >
      {snapshots.map((snapshot) => (
        <option key={snapshot.id} value={snapshot.id}>
          {optionLabel(snapshot)}
        </option>
      ))}
    </select>
  );
}
