import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <section className="rounded-2xl border bg-[var(--surface)] p-6 shadow-sm sm:p-8">
      <p className="text-sm font-semibold text-[var(--brand)]">Account recovery</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
        Password reset links can be used once and expire after one hour.
      </p>
      <div className="mt-8">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            This password reset link is invalid.
          </p>
        )}
      </div>
      <Link className="mt-6 inline-block text-sm font-medium text-[var(--brand)] hover:underline" href="/login">
        Return to sign in
      </Link>
    </section>
  );
}
