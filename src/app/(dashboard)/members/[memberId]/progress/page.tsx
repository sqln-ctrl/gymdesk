/* eslint-disable @next/next/no-img-element -- protected photos must retain the browser session. */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProgressEntryForm } from "@/components/progress/progress-entry-form";
import { ProgressMetricCharts } from "@/components/progress/progress-metric-charts";
import { Button } from "@/components/ui/button";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getMemberDetail } from "@/server/services/members";
import { getMemberProgress } from "@/server/services/progress";

type PageProps = { params: Promise<{ memberId: string }> };

const measurements = [
  ["weightKg", "Weight", "kg"],
  ["bodyFatPercent", "Body fat", "%"],
  ["chestCm", "Chest", "cm"],
  ["waistCm", "Waist", "cm"],
  ["hipsCm", "Hips", "cm"],
  ["armsCm", "Arms", "cm"],
  ["thighsCm", "Thighs", "cm"],
] as const;

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(value);
}

function formatMeasurement(value: number, unit: string): string {
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)}${unit === "%" ? "" : " "}${unit}`;
}

export default async function MemberProgressPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "progress.read") && !hasPermission(user, "progress.manage")) redirect("/dashboard");
  const { memberId } = await params;
  const [member, progress] = await Promise.all([getMemberDetail(user, memberId), getMemberProgress(user, memberId)]);
  if (!member || !progress) notFound();

  const chartEntries = progress.entries.map((entry) => ({
    id: entry.id,
    recordedAt: entry.recordedAt.toISOString(),
    weightKg: entry.weightKg,
    bodyFatPercent: entry.bodyFatPercent,
    chestCm: entry.chestCm,
    waistCm: entry.waistCm,
    hipsCm: entry.hipsCm,
    armsCm: entry.armsCm,
    thighsCm: entry.thighsCm,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-medium text-[var(--brand)]">{member.memberCode}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{member.firstName} {member.lastName} progress</h1><p className="mt-2 text-sm text-[var(--muted-foreground)]">Measurements, trainer observations, and protected progress photos.</p></div>
        <Button asChild variant="secondary"><Link href={`/members/${member.id}`}>Profile</Link></Button>
      </section>

      {progress.canManage ? <section className="rounded-xl border bg-[var(--surface)] p-5"><h2 className="font-semibold">Add measurement</h2><ProgressEntryForm memberId={member.id} today={new Date().toISOString().slice(0, 10)} /></section> : null}
      <ProgressMetricCharts entries={chartEntries} />

      <section className="space-y-4">
        <div><h2 className="font-semibold">History</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Most recent entries first.</p></div>
        {progress.entries.length === 0 ? <p className="rounded-xl border bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted-foreground)]">No progress entries are recorded yet.</p> : progress.entries.map((entry) => {
          const values = measurements.flatMap(([key, label, unit]) => {
            const value = entry[key];
            return value === null ? [] : [{ label, value: formatMeasurement(value, unit) }];
          });
          return <article className="rounded-xl border bg-[var(--surface)] p-5" key={entry.id}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold">{formatDate(entry.recordedAt)}</h3><p className="mt-1 text-sm text-[var(--muted-foreground)]">Recorded by {entry.recordedByName}</p></div></div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{values.map((measurement) => <div key={measurement.label}><dt className="text-xs text-[var(--muted-foreground)]">{measurement.label}</dt><dd className="mt-1 text-sm font-semibold">{measurement.value}</dd></div>)}</dl>
            {entry.notes ? <p className="mt-4 whitespace-pre-wrap border-t pt-4 text-sm leading-6 text-[var(--muted-foreground)]">{entry.notes}</p> : null}
            {entry.photos.length > 0 ? <div className="mt-4 flex flex-wrap gap-3 border-t pt-4">{entry.photos.map((photo, index) => <a className="overflow-hidden rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--brand)]" href={`/api/progress-photos/${photo.id}`} key={photo.id} rel="noreferrer" target="_blank"><img alt={`Progress photo ${index + 1} from ${formatDate(entry.recordedAt)}`} className="size-24 object-cover" src={`/api/progress-photos/${photo.id}`} /></a>)}</div> : null}
          </article>;
        })}
      </section>
    </div>
  );
}
