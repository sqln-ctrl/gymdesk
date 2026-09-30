import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { hasPermission, requireCurrentUser } from "@/lib/permissions/guards";
import { listInvoices } from "@/server/services/billing";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function InvoicesPage() {
  const user = await requireCurrentUser();
  if (!hasPermission(user, "invoice.read")) redirect("/dashboard");
  const invoices = await listInvoices(user);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--brand)]">Billing</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Review issued membership invoices and outstanding balances.</p>
        </div>
        <Button asChild variant="secondary"><Link href="/payments">Daily payments</Link></Button>
      </section>
      {invoices.length === 0 ? (
        <EmptyState title="No invoices yet" description="Invoices are created automatically when a membership is sold." />
      ) : (
        <section className="overflow-hidden rounded-xl border bg-[var(--surface)]">
          <div className="overflow-x-auto">
            <table className="min-w-[780px] w-full text-left text-sm">
              <thead className="border-b bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Member</th><th className="px-5 py-3">Branch</th><th className="px-5 py-3">Issued</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Balance</th></tr>
              </thead>
              <tbody className="divide-y">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-5 py-4"><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td>
                    <td className="px-5 py-4"><Link className="hover:underline" href={`/members/${invoice.member.id}`}>{invoice.member.firstName} {invoice.member.lastName}</Link><p className="text-xs text-[var(--muted-foreground)]">{invoice.member.memberCode}</p></td>
                    <td className="px-5 py-4">{invoice.branch.name}</td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">{formatDate(invoice.issueDate)}</td>
                    <td className="px-5 py-4"><span className="font-medium">{invoice.status.replaceAll("_", " ")}</span></td>
                    <td className="px-5 py-4 tabular-nums">{formatMoney(invoice.balanceMinor)}</td>
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
