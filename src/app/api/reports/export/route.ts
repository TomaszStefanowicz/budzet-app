import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { loadAvailableMonths, loadReportFacts } from "@/app/reports/data";
import {
  buildSummarySheetRows,
  buildClientsSheetRows,
  buildExpiringSheetRows,
  buildPackageStartSheetRows,
} from "@/app/reports/export";
import { buildMonthlySummary } from "@/lib/reports/buildMonthlySummary";
import { buildClientMonthlyRevenueReport } from "@/lib/reports/buildClientMonthlyRevenueReport";
import { buildExpiringContractsReport } from "@/lib/reports/buildExpiringContractsReport";
import { isWithinExpiringHorizon } from "@/lib/reports/expiringReportHorizon";
import { buildPackageStartReport } from "@/lib/reports/buildPackageStartReport";
import { isWithinPackageStartHorizon } from "@/lib/reports/packageStartHorizon";
import { countBanksAndSkoks } from "@/lib/reports/countBanksAndSkoks";

export async function GET(request: Request) {
  const month = new URL(request.url).searchParams.get("month");

  const availableMonths = await loadAvailableMonths();
  if (!month || !availableMonths.includes(month)) {
    return NextResponse.json(
      { error: "Nieprawidłowy lub brakujący parametr month (musi być w wykrytym zakresie danych)." },
      { status: 400 }
    );
  }

  const { salesFacts, itemMonthFacts, clientNames, clientTypes } = await loadReportFacts();
  const summary = buildMonthlySummary(salesFacts, itemMonthFacts, month);
  const clientReport = buildClientMonthlyRevenueReport(itemMonthFacts, month).sort(
    (a, b) => b.revenueGrosze - a.revenueGrosze
  );
  const banksAndSkoks = countBanksAndSkoks(clientReport.map((row) => row.nip), clientTypes);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(buildSummarySheetRows(summary, banksAndSkoks)),
    "Zestawienia 1-11, 16"
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(buildClientsSheetRows(clientReport, clientNames)),
    "Zestawienie 12"
  );

  if (isWithinExpiringHorizon(availableMonths, month)) {
    const expiringReport = buildExpiringContractsReport(itemMonthFacts, month).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(buildExpiringSheetRows(expiringReport, clientNames)),
      "Zestawienie 13"
    );
  }

  if (isWithinPackageStartHorizon(availableMonths, month)) {
    const newClientsReport = buildPackageStartReport(itemMonthFacts, "F", month).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(buildPackageStartSheetRows(newClientsReport, clientNames)),
      "Zestawienie 14"
    );

    const renewalStartsReport = buildPackageStartReport(itemMonthFacts, "G", month).sort(
      (a, b) => b.revenueGrosze - a.revenueGrosze
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(buildPackageStartSheetRows(renewalStartsReport, clientNames)),
      "Zestawienie 15"
    );
  }

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="zestawienia-${month.slice(0, 7)}.xlsx"`,
    },
  });
}
