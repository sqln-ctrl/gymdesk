type MetricTrendProps = {
  title: string;
  description: string;
  values: Array<{ date: string; value: number; secondaryValue?: number }>;
  valueLabel: string;
  secondaryLabel?: string;
};

function labelForDate(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

export function MetricTrend({ title, description, values, valueLabel, secondaryLabel }: MetricTrendProps) {
  const maxValue = Math.max(
    ...values.flatMap((value) => [value.value, value.secondaryValue ?? 0]),
    1,
  );
  const visibleValues = values.length > 31 ? values.slice(-31) : values;

  return (
    <section className="rounded-xl border bg-[var(--surface)] p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
        </div>
        <div className="flex gap-3 text-xs text-[var(--muted-foreground)]">
          <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-[var(--brand)]" />{valueLabel}</span>
          {secondaryLabel ? <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-600" />{secondaryLabel}</span> : null}
        </div>
      </div>
      {values.every((value) => value.value === 0 && (value.secondaryValue ?? 0) === 0) ? (
        <p className="mt-8 text-sm text-[var(--muted-foreground)]">No data was recorded in this period.</p>
      ) : (
        <div aria-label={`${title} chart`} className="mt-5 flex h-48 items-end gap-1" role="img">
          {visibleValues.map((entry) => (
            <div className="flex h-full min-w-0 flex-1 flex-col justify-end" key={entry.date} title={`${labelForDate(entry.date)}: ${entry.value} ${valueLabel}${secondaryLabel ? `; ${entry.secondaryValue ?? 0} ${secondaryLabel}` : ""}`}>
              <div className="flex flex-1 items-end gap-px">
                <span className="min-h-0 flex-1 rounded-t-sm bg-[var(--brand)]" style={{ height: `${(entry.value / maxValue) * 100}%` }} />
                {secondaryLabel ? <span className="min-h-0 flex-1 rounded-t-sm bg-amber-600" style={{ height: `${((entry.secondaryValue ?? 0) / maxValue) * 100}%` }} /> : null}
              </div>
              <span className="mt-2 truncate text-center text-[10px] text-[var(--muted-foreground)]">{labelForDate(entry.date)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
