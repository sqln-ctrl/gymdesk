import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <section className="max-w-md rounded-xl border bg-[var(--surface)] p-8 text-center">
        <p className="text-sm font-semibold text-[var(--brand)]">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
          This route is not available in GymFlow.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
