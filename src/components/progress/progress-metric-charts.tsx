"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type MetricKey = "weightKg" | "bodyFatPercent" | "chestCm" | "waistCm" | "hipsCm" | "armsCm" | "thighsCm";

type ProgressChartEntry = {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  bodyFatPercent: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  armsCm: number | null;
  thighsCm: number | null;
};

const metrics: Array<{ key: MetricKey; label: string; unit: string; color: string }> = [
  { key: "weightKg", label: "Weight", unit: "kg", color: "#2563eb" },
  { key: "bodyFatPercent", label: "Body fat", unit: "%", color: "#9333ea" },
  { key: "chestCm", label: "Chest", unit: "cm", color: "#0891b2" },
  { key: "waistCm", label: "Waist", unit: "cm", color: "#ea580c" },
  { key: "hipsCm", label: "Hips", unit: "cm", color: "#db2777" },
  { key: "armsCm", label: "Arms", unit: "cm", color: "#65a30d" },
  { key: "thighsCm", label: "Thighs", unit: "cm", color: "#b45309" },
];

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(value));
}

export function ProgressMetricCharts({ entries }: { entries: ProgressChartEntry[] }) {
  const availableMetrics = metrics.filter((metric) => entries.some((entry) => entry[metric.key] !== null));
  const [selectedKey, setSelectedKey] = useState<MetricKey>(availableMetrics[0]?.key ?? "weightKg");
  const selectedMetric = metrics.find((metric) => metric.key === selectedKey) ?? metrics[0];
  const chartData = useMemo(
    () => entries.slice().reverse().flatMap((entry) => entry[selectedMetric.key] === null ? [] : [{ date: dateLabel(entry.recordedAt), value: entry[selectedMetric.key] }]),
    [entries, selectedMetric.key],
  );

  if (availableMetrics.length === 0) {
    return <p className="rounded-xl border bg-[var(--surface)] p-5 text-sm text-[var(--muted-foreground)]">Charts appear after the first numeric measurement is recorded.</p>;
  }

  return (
    <section className="rounded-xl border bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-semibold">Metric history</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Compare one metric over time.</p></div>
        <div aria-label="Metric" className="flex flex-wrap gap-2" role="group">
          {availableMetrics.map((metric) => <button aria-pressed={metric.key === selectedKey} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${metric.key === selectedKey ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand)]" : "bg-white text-[var(--muted-foreground)]"}`} key={metric.key} onClick={() => setSelectedKey(metric.key)} type="button">{metric.label}</button>)}
        </div>
      </div>
      <div className="mt-5 h-64" role="img" aria-label={`${selectedMetric.label} history chart`}>
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} tickLine={false} />
            <YAxis fontSize={12} tickLine={false} width={44} />
            <Tooltip formatter={(value) => [`${value ?? "—"} ${selectedMetric.unit}`, selectedMetric.label] as [string, string]} />
            <Line activeDot={{ r: 5 }} dataKey="value" dot={{ r: 3 }} name={selectedMetric.label} stroke={selectedMetric.color} strokeWidth={2} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
