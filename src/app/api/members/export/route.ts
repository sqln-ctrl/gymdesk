import { getCurrentUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions/policy";
import { listMemberExportRows } from "@/server/services/members";

function csvCell(value: string | null): string {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, "member.read")) {
    return new Response("Forbidden", { status: 403 });
  }

  const members = await listMemberExportRows(user);
  const header = ["Member code", "Name", "Phone", "Email", "Branch", "Trainer", "Status", "Join date"];
  const rows = members.map((member) => [
    member.memberCode,
    member.fullName,
    member.phone,
    member.email,
    member.branchName,
    member.trainerName,
    member.status,
    member.joinDate.toISOString().slice(0, 10),
  ].map(csvCell).join(","));
  const filenameDate = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${[header.map(csvCell).join(","), ...rows].join("\r\n")}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gymflow-members-${filenameDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
