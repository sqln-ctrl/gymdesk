import { redirect } from "next/navigation";

import { BootstrapForm } from "@/components/auth/bootstrap-form";
import { getCurrentUser } from "@/lib/auth/session";
import { isBootstrapRequired } from "@/server/services/bootstrap";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  if (!(await isBootstrapRequired())) {
    redirect("/login");
  }

  return (
    <section className="rounded-2xl border bg-[var(--surface)] p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[var(--brand)]">First-time setup</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Set up the first gym, branch, and owner account. This can only be completed once.
      </p>
      <div className="mt-8">
        <BootstrapForm />
      </div>
    </section>
  );
}
