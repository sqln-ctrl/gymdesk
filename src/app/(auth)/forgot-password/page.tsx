import Link from "next/link";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/session";
import { isBootstrapRequired } from "@/server/services/bootstrap";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) {
    redirect("/dashboard");
  }

  if (await isBootstrapRequired()) {
    redirect("/setup");
  }

  return (
    <section className="rounded-2xl border bg-[var(--surface)] p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[var(--brand)]">Account recovery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Enter your staff email to prepare a password reset link.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <Link className="mt-6 inline-block text-sm font-medium text-[var(--brand)] hover:underline" href="/login">
        Return to sign in
      </Link>
    </section>
  );
}
