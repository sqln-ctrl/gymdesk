import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/billing/constants";
import { formatMoney, sumMoney } from "@/lib/money";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listDailyPayments } from "@/server/services/billing";

type PageProps = {
  searchParams: Promise<{ date?: string; method?: string }>;
};

function utcDay(value: string | undefined): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const day = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(day.getTime()) ? new Date() : day;
}

function dayInputValue(day: Date): string {
  return `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, "0")}-${String(day.getUTCDate()).padStart(2, "0")}`;
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(value);
}

export default async function PaymentsPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "invoice.read")) redirect("/dashboard");

  const query = await searchParams;
  const day = utcDay(query.date);
  const method = PAYMENT_METHODS.includes(query.method as PaymentMethod)
    ? query.method as PaymentMethod
    : undefined;
  const payments = await listDailyPayments(user, { day, method });
  const grossMinor = sumMoney(...payments.map((payment) => payment.amountMinor));
  const refundedMinor = sumMoney(...payments.map((payment) => payment.refundedMinor));
  const netMinor = sumMoney(...payments.map((payment) => payment.netMinor));

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Billing</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Daily payments</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Gross collections, refunds, and net received for one UTC business day.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/invoices">All invoices</Link></Button>
      </section>

      <form className="flex flex-col gap-3 rounded-xl border bg-[var(--surface)] p-4 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-sm font-medium">Date
          <input className="h-10 rounded-lg border px-3 font-normal" defaultValue={dayInputValue(day)} name="date" type="date" />
        </label>
        <label className="grid gap-1 text-sm font-medium">Method
          <select className="h-10 rounded-lg border bg-[var(--surface)] px-3 font-normal" defaultValue={method ?? ""} name="method">
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((item) => <option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>)}
          </select>
        </label>
        <Button type="submit">Apply filters</Button>
      </form>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-[var(--surface)] p-4"><p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Gross</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatMoney(grossMinor)}</p></div>
        <div className="rounded-xl border bg-[var(--surface)] p-4"><p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Refunded</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatMoney(refundedMinor)}</p></div>
        <div className="rounded-xl border bg-[var(--surface)] p-4"><p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">Net received</p><p className="mt-2 text-xl font-semibold tabular-nums">{formatMoney(netMinor)}</p></div>
      </section>

      {payments.length === 0 ? (
        <EmptyState title="No payments for this day" description="Try another date or remove the payment-method filter." />
      ) : (
        <section className="overflow-hidden rounded-xl border bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-[820px] w-full text-left text-sm">
              <thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Member</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Method</th><th className="px-5 py-3">Gross</th><th className="px-5 py-3">Refunded</th><th className="px-5 py-3">Net</th></tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{formatTime(payment.paidAt)}</td>
                    <td className="px-5 py-4"><Link className="hover:underline" href={`/members/${payment.member.id}`}>{payment.member.firstName} {payment.member.lastName}</Link><p className="text-xs text-[var(--muted-foreground)]">{payment.member.memberCode}</p></td>
                    <td className="px-5 py-4"><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/invoices/${payment.invoice.id}`}>{payment.invoice.invoiceNumber}</Link></td>
                    <td className="px-5 py-4">{PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method}</td>
                    <td className="px-5 py-4 tabular-nums">{formatMoney(payment.amountMinor)}</td>
                    <td className="px-5 py-4 tabular-nums">{formatMoney(payment.refundedMinor)}</td>
                    <td className="px-5 py-4 font-semibold tabular-nums">{formatMoney(payment.netMinor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
