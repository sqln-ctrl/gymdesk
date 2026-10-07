"use client";

import { useEffect, useState } from "react";

function formatNow(value: Date): string {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "medium" }).format(value);
}

export function CurrentSystemTime() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(new Date()), 0);
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, []);
  return <p className="text-sm text-[var(--muted-foreground)]" aria-live="polite">System time: <span className="font-medium text-[var(--foreground)]">{now ? formatNow(now) : "Loading…"}</span></p>;
}
