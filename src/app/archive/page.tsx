import {
  archivedRowToReportRow,
  archivedSummaryToMonthlySummary,
  archivedClientNames,
} from "@/lib/reports/archivedPayload";
import { ClientReportTable } from "../reports/ClientReportTable";
import { ReportSection } from "../reports/ReportSection";
import { SummaryTable } from "../reports/SummaryTable";
import { Nav } from "../components/Nav";
import { ArchiveSelect } from "./ArchiveSelect";
import { loadArchiveSnapshots, loadArchiveSnapshotPayload } from "./data";

export const dynamic = "force-dynamic";

export default async function ArchivePage(props: PageProps<"/archive">) {
  const searchParams = await props.searchParams;
  const snapshots = await loadArchiveSnapshots();

  if (snapshots.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
        <div className="w-full max-w-6xl">
          <Nav active="archive" />
        </div>
        <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-gray-900">Archiwum</h1>
          <p className="text-sm text-gray-500">
            Brak zapisanych migawek. Użyj przycisku „Zapisz do archiwum” na stronie Zestawienia.
          </p>
        </div>
      </div>
    );
  }

  const requestedId = typeof searchParams.id === "string" ? Number(searchParams.id) : undefined;
  const selectedId = requestedId && snapshots.some((s) => s.id === requestedId) ? requestedId : snapshots[0].id;

  const payload = await loadArchiveSnapshotPayload(selectedId);
  const summary = archivedSummaryToMonthlySummary(payload);
  const clientNames = archivedClientNames(payload);
  const clientReport = (payload.clients ?? []).map(archivedRowToReportRow);

  const banksAndSkoksAvailable = payload.banksAndSkoksClients !== undefined;
  const banksAndSkoksReport = (payload.banksAndSkoksClients ?? []).map(archivedRowToReportRow);

  const expiringEligible = payload.expiringClients !== undefined;
  const expiringReport = (payload.expiringClients ?? []).map(archivedRowToReportRow);

  const allExpiringEligible = payload.allExpiringClients !== undefined;
  const allExpiringReport = (payload.allExpiringClients ?? []).map(archivedRowToReportRow);

  const startEligible = payload.newClients !== undefined;
  const newClientsReport = (payload.newClients ?? []).map(archivedRowToReportRow);
  const renewalStartsReport = (payload.renewalStarts ?? []).map(archivedRowToReportRow);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-gray-50 px-4 py-12">
      <div className="flex w-full max-w-6xl flex-col gap-3">
        <Nav active="archive" />
        <div className="flex items-center justify-end gap-3">
          <span className="text-sm font-bold text-red-600">ARCHIWUM</span>
          <span className="text-sm text-gray-500">Wybierz migawkę:</span>
          <ArchiveSelect snapshots={snapshots} selectedId={selectedId} />
        </div>
      </div>

      <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="mb-4 text-xl font-bold text-gray-900">Zestawienia 1–11</h1>
        <SummaryTable summary={summary} />
      </div>

      <div className="w-full max-w-6xl rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-bold text-gray-900">12. Klienci z przychodem w miesiącu</h2>
        <ClientReportTable
          rows={clientReport}
          clientNames={clientNames}
          revenueLabel="Przychód miesiąca"
          emptyMessage="Brak klientów z przychodem w tym miesiącu."
        />
      </div>

      <ReportSection
        title="13. Klienci, których umowy wygasły w tym miesiącu (wszyscy)"
        eligible={allExpiringEligible}
        rows={allExpiringReport}
        clientNames={clientNames}
        revenueLabel="Wartość do utraty (miesiąc poprzedni)"
        emptyMessage="Brak klientów, których umowy wygasły w tym miesiącu."
        unavailableMessage="Niedostępne w tej migawce — miesiąc był poza horyzontem zestawienia w chwili archiwizacji, albo migawka zapisana przed dodaniem tego zestawienia."
      />

      <ReportSection
        title="14. Klienci, których umowy wygasły w tym miesiącu i dotychczas nie przedłużyli"
        eligible={expiringEligible}
        rows={expiringReport}
        clientNames={clientNames}
        revenueLabel="Wartość do utraty (miesiąc poprzedni)"
        emptyMessage="Brak klientów, których umowy wygasły w tym miesiącu i dotychczas nie przedłużyli."
        unavailableMessage="Niedostępne w tej migawce — miesiąc był poza horyzontem zestawienia w chwili archiwizacji."
      />

      <ReportSection
        title="15. Klienci przedłużający, których przedłużenie zaczyna się w tym miesiącu"
        eligible={startEligible}
        rows={renewalStartsReport}
        clientNames={clientNames}
        revenueLabel="Wartość (pierwszy pełny miesiąc)"
        emptyMessage="Brak przedłużeń zaczynających się w tym miesiącu."
        unavailableMessage="Niedostępne w tej migawce — miesiąc był poza horyzontem zestawienia w chwili archiwizacji."
      />

      <ReportSection
        title="16. Nowi klienci, których pakiet zaczyna się w tym miesiącu"
        eligible={startEligible}
        rows={newClientsReport}
        clientNames={clientNames}
        revenueLabel="Wartość (pierwszy pełny miesiąc)"
        emptyMessage="Brak nowych klientów zaczynających w tym miesiącu."
        unavailableMessage="Niedostępne w tej migawce — miesiąc był poza horyzontem zestawienia w chwili archiwizacji."
      />

      <ReportSection
        title="17. Banki i SKOK-i wśród płacących klientów"
        eligible={banksAndSkoksAvailable}
        rows={banksAndSkoksReport}
        clientNames={clientNames}
        revenueLabel="Przychód miesiąca"
        emptyMessage="Brak banków/SKOK-ów z przychodem w tym miesiącu."
        unavailableMessage={
          payload.summary.banksAndSkoks !== undefined
            ? `Niedostępne jako lista w tej starszej migawce — zapisana wyłącznie liczba: ${payload.summary.banksAndSkoks}.`
            : "Niedostępne w tej migawce."
        }
      />
    </div>
  );
}
