import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PaymentForm } from "@/components/billing/payment-form";
import { RefundForm } from "@/components/billing/refund-form";
import { VoidInvoiceForm } from "@/components/billing/void-invoice-form";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { getInvoice } from "@/server/services/billing";

type PageProps = { params: Promise<{ invoiceId: string }> };

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

export default async function InvoicePage({ params }: PageProps) {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "invoice.read")) redirect("/dashboard");

  const { invoiceId } = await params;
  const invoice = await getInvoice(user, invoiceId);
  if (!invoice) notFound();

  const canRecordPayment = hasPermission(user, "payment.record") && invoice.status !== "VOID";
  const canRefund = hasPermission(user, "payment.refund") && invoice.status !== "VOID";
  const canVoid = hasPermission(user, "invoice.void") && invoice.status !== "VOID";

  return (
    <main className="mx-auto max-w-3xl space-y-6 print:max-w-none">
      <header className="flex flex-col gap-4 rounded-xl border bg-[var(--surface)] p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">{invoice.invoiceNumber}</p>
          <h1 className="mt-1 text-3xl font-semibold">Invoice</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {invoice.member.firstName} {invoice.member.lastName} · {invoice.member.memberCode} · {invoice.branch.name}
          </p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Issued {formatDate(invoice.issueDate)}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button asChild size="sm" variant="secondary">
            <Link href="/invoices">All invoices</Link>
          </Button>
          <span className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold">{invoice.status.replaceAll("_", " ")}</span>
        </div>
      </header>

      <section className="rounded-xl border bg-[var(--surface)] p-6">
        <div className="space-y-3">
          {invoice.items.map((item) => (
            <div className="flex justify-between gap-4 text-sm" key={item.id}>
              <span>{item.description} × {item.quantity}</span>
              <span>{formatMoney(item.totalMinor)}</span>
            </div>
          ))}
        </div>
        <dl className="mt-6 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(invoice.subtotalMinor)}</dd></div>
          <div className="flex justify-between"><dt>Discount</dt><dd>-{formatMoney(invoice.discountMinor)}</dd></div>
          <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(invoice.taxMinor)}</dd></div>
          <div className="flex justify-between"><dt>Paid</dt><dd>{formatMoney(invoice.paidMinor)}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Balance due</dt><dd>{formatMoney(invoice.balanceMinor)}</dd></div>
        </dl>
      </section>

      <section className="rounded-xl border bg-[var(--surface)] p-6 print:hidden">
        <h2 className="font-semibold">Record payment</h2>
        {canRecordPayment ? (
          <PaymentForm invoiceId={invoice.id} balanceMinor={invoice.balanceMinor} />
        ) : (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {invoice.status === "VOID" ? "A void invoice cannot receive payments." : "You do not have permission to record payments."}
          </p>
        )}
      </section>

      <section className="rounded-xl border bg-[var(--surface)] p-6">
        <h2 className="font-semibold">Payments</h2>
        {invoice.payments.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">No payments recorded.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {invoice.payments.map((payment) => (
              <li className="border-b pb-4 last:border-0 last:pb-0" key={payment.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                  <span>
                    <span className="font-medium">{payment.method.replaceAll("_", " ")}</span>
                    {payment.reference ? ` · ${payment.reference}` : ""}
                    <span className="ml-2 text-xs text-[var(--muted-foreground)]">{formatDate(payment.paidAt)}</span>
                  </span>
                  <span className="font-medium">{formatMoney(payment.amountMinor)}</span>
                </div>
                {payment.refundedMinor > 0 ? (
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                    Refunded: {formatMoney(payment.refundedMinor)} · Net received: {formatMoney(payment.netMinor)}
                  </p>
                ) : null}
                {canRefund ? (
                  <RefundForm
                    invoiceId={invoice.id}
                    paymentId={payment.id}
                    remainingMinor={payment.amountMinor - payment.refundedMinor}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canVoid ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-6 print:hidden">
          <h2 className="font-semibold text-red-900">Void invoice</h2>
          <p className="mt-1 text-sm text-red-800">Invoices can be voided only after their net payments have been refunded.</p>
          <VoidInvoiceForm invoiceId={invoice.id} />
        </section>
      ) : null}
    </main>
  );
}
