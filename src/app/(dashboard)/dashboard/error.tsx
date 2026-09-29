"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h1 className="text-lg font-semibold text-red-900">Dashboard unavailable</h1>
      <p className="mt-2 text-sm text-red-800">
        The dashboard could not be loaded. Please try again.
      </p>
      <Button
        className="mt-4"
        onClick={reset}
        type="button"
        variant="danger"
      >
        Try again
      </Button>
    </section>
  );
}
