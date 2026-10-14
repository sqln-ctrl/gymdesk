import { getCurrentUser } from "@/lib/auth/session";
import { toCsv, type CsvValue } from "@/lib/reports/csv";
import { parseReportDateRange } from "@/lib/reports/filters";
import { getReports } from "@/server/services/reports";

const REPORT_EXPORT_KINDS = ["operational", "attendance", "financial", "maintenance"] as const;
type ReportExportKind = (typeof REPORT_EXPORT_KINDS)[number];

function isReportExportKind(value: string | null): value is ReportExportKind {
  return REPORT_EXPORT_KINDS.includes(value as ReportExportKind);
}

function exportRows(kind: ReportExportKind, report: NonNullable<Awaited<ReturnType<typeof getReports>>>): {
  headers: string[];
  rows: CsvValue[][];
} | null {
  if (kind === "operational") {
    if (!report.operational) return null;
    const { members, attendance, staffing, classes } = report.operational;
    return {
      headers: ["Report", "Metric", "Value"],
      rows: [
        ["Members", "Total members", members.total],
        ["Members", "Active member records", members.active],
        ["Members", "Active memberships", members.activeMemberships],
        ["Members", "New joins", members.newJoins],
        ["Memberships", "Memberships sold", members.membershipsSold],
        ["Memberships", "Renewals", members.renewals],
        ["Memberships", "Expired memberships", members.expiredMemberships],
        ["Memberships", "Expiring in 30 days", members.expiringMemberships],
        ["Attendance", "Check-ins", attendance.totalCheckIns],
        ["Attendance", "Unique members", attendance.uniqueMembers],
        ["Staffing", "Assigned members", staffing.assignedMembers],
        ["Classes", "Sessions", classes.sessions],
        ["Classes", "Booked places", classes.booked],
        ["Classes", "Available places", classes.capacity],
        ...members.statusCounts.map((item) => ["Member status", item.status, item.count]),
        ...members.planDistribution.map((item) => ["Active plan", item.planName, item.count]),
        ...staffing.trainers.map((item) => ["Trainer assignment", item.trainerName, item.assignedMembers]),
      ],
    };
  }

  if (kind === "attendance") {
    if (!report.operational) return null;
    return {
      headers: ["Date", "Check-ins"],
      rows: report.operational.attendance.daily.map((item) => [item.date, item.value]),
    };
  }

  if (kind === "maintenance") {
    if (!report.operational) return null;
    return {
      headers: ["Service date", "Equipment", "Branch", "Service type", "Cost (minor units)"],
      rows: report.operational.maintenance.records.map((record) => [
        record.servicedAt.toISOString().slice(0, 10),
        record.equipmentName,
        record.branchName,
        record.serviceType,
        record.costMinor,
      ]),
    };
  }

  if (!report.finance) return null;
  return {
    headers: ["Payment method", "Gross (minor units)", "Refunded (minor units)", "Net (minor units)"],
    rows: report.finance.paymentsByMethod.map((item) => [
      item.method,
      item.grossMinor,
      item.refundedMinor,
      item.netMinor,
    ]),
  };
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (!isReportExportKind(kind)) return new Response("Unknown report export.", { status: 400 });

  const range = parseReportDateRange({
    start: url.searchParams.get("start") ?? undefined,
    end: url.searchParams.get("end") ?? undefined,
  });
  const report = await getReports(user, {
    start: range.start,
    end: range.end,
    branchId: url.searchParams.get("branchId") ?? undefined,
  });
  if (!report) return new Response("Forbidden", { status: 403 });

  const data = exportRows(kind, report);
  if (!data) return new Response("Forbidden", { status: 403 });

  const filenameDate = range.endInput;
  return new Response(`\uFEFF${toCsv(data.headers, data.rows)}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gymflow-${kind}-${filenameDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
