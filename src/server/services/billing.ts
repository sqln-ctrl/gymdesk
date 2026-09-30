import "server-only";

import type { Prisma } from "@prisma/client";

import { writeAuditLog } from "@/lib/audit/service";
import type { CurrentUser } from "@/lib/auth/session";
import { calculateInvoiceSettlement } from "@/lib/billing/calculations";
import type { PaymentMethod } from "@/lib/billing/constants";
import { prisma } from "@/lib/db/prisma";
import { OWNER_ROLE_KEY } from "@/lib/permissions/keys";
import { hasPermission } from "@/lib/permissions/policy";

type Transaction = Prisma.TransactionClient;
type ServiceResult<T> = { ok: true; data: T } | { ok: false; message: string };

type PaymentInput = {
  invoiceId: string;
  amountMinor: number;
  method: PaymentMethod;
  reference?: string;
};

type RefundInput = {
  paymentId: string;
  amountMinor: number;
  reason: string;
};

type InvoiceAccessInput = {
  invoiceId: string;
  reason: string;
};

class BillingError extends Error {}

function hasOwnerAccess(actor: CurrentUser): boolean {
  return actor.roleKeys.includes(OWNER_ROLE_KEY);
}

function accessibleInvoiceWhere(actor: CurrentUser): Prisma.InvoiceWhereInput {
  return hasOwnerAccess(actor)
    ? { branch: { gymId: { in: [...actor.gymIds] } } }
    : { branchId: { in: [...actor.branchIds] } };
}

function accessiblePaymentWhere(actor: CurrentUser): Prisma.PaymentWhereInput {
  return hasOwnerAccess(actor)
    ? { branch: { gymId: { in: [...actor.gymIds] } } }
    : { branchId: { in: [...actor.branchIds] } };
}

function paymentStatus(refundedMinor: number, amountMinor: number): string {
  if (refundedMinor === 0) return "COMPLETED";
  return refundedMinor === amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED";
}

export async function allocateInvoiceNumber(
  transaction: Transaction,
  branchId: string,
  branchCode: string,
  issueDate: Date,
): Promise<string> {
  const year = issueDate.getUTCFullYear();
  const sequence = await transaction.invoiceSequence.upsert({
    where: { branchId_year: { branchId, year } },
    create: { branchId, year, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
    select: { nextNumber: true },
  });

  return `INV-${branchCode.toUpperCase()}-${year}-${String(sequence.nextNumber - 1).padStart(5, "0")}`;
}

export async function createMembershipInvoice(
  transaction: Transaction,
  input: {
    membershipId: string;
    memberId: string;
    branchId: string;
    branchCode: string;
    planName: string;
    issueDate: Date;
    subtotalMinor: number;
    discountMinor: number;
    taxMinor: number;
    totalMinor: number;
    actorUserId: string;
  },
): Promise<{ id: string; invoiceNumber: string }> {
  const invoiceNumber = await allocateInvoiceNumber(
    transaction,
    input.branchId,
    input.branchCode,
    input.issueDate,
  );
  const settlement = calculateInvoiceSettlement(input.totalMinor, 0);
  const invoice = await transaction.invoice.create({
    data: {
      memberId: input.memberId,
      branchId: input.branchId,
      invoiceNumber,
      issueDate: input.issueDate,
      status: settlement.status,
      subtotalMinor: input.subtotalMinor,
      discountMinor: input.discountMinor,
      taxMinor: input.taxMinor,
      totalMinor: input.totalMinor,
      paidMinor: settlement.paidMinor,
      balanceMinor: settlement.balanceMinor,
      items: {
        create: {
          membershipId: input.membershipId,
          type: "MEMBERSHIP",
          description: `${input.planName} membership`,
          quantity: 1,
          unitPriceMinor: input.subtotalMinor,
          totalMinor: input.subtotalMinor,
        },
      },
    },
    select: { id: true, invoiceNumber: true },
  });

  await writeAuditLog(transaction, {
    actorUserId: input.actorUserId,
    action: "INVOICE_CREATED",
    entityType: "Invoice",
    entityId: invoice.id,
    after: {
      invoiceNumber: invoice.invoiceNumber,
      membershipId: input.membershipId,
      totalMinor: input.totalMinor,
    },
  });

  return invoice;
}

export async function recordPayment(
  actor: CurrentUser,
  input: PaymentInput,
): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "payment.record")) {
    return { ok: false, message: "You do not have permission to record payments." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const invoice = await transaction.invoice.findFirst({
        where: {
          id: input.invoiceId,
          ...accessibleInvoiceWhere(actor),
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
        },
        select: {
          id: true,
          memberId: true,
          branchId: true,
          totalMinor: true,
          paidMinor: true,
          balanceMinor: true,
        },
      });

      if (!invoice) {
        throw new BillingError("Invoice access was not found or it cannot receive a payment.");
      }
      if (input.amountMinor > invoice.balanceMinor) {
        throw new BillingError("Payment cannot exceed the outstanding balance.");
      }

      const settlement = calculateInvoiceSettlement(
        invoice.totalMinor,
        invoice.paidMinor + input.amountMinor,
      );
      const updated = await transaction.invoice.updateMany({
        where: {
          id: invoice.id,
          status: { in: ["UNPAID", "PARTIALLY_PAID"] },
          balanceMinor: invoice.balanceMinor,
        },
        data: settlement,
      });
      if (updated.count !== 1) {
        throw new BillingError("This invoice changed before the payment was recorded. Refresh and try again.");
      }

      const payment = await transaction.payment.create({
        data: {
          invoiceId: invoice.id,
          memberId: invoice.memberId,
          branchId: invoice.branchId,
          amountMinor: input.amountMinor,
          method: input.method,
          reference: input.reference ?? null,
          createdById: actor.id,
        },
        select: { id: true },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "PAYMENT_RECORDED",
        entityType: "Payment",
        entityId: payment.id,
        after: {
          invoiceId: invoice.id,
          amountMinor: input.amountMinor,
          balanceMinor: settlement.balanceMinor,
          method: input.method,
        },
      });
    });
  } catch (error) {
    if (error instanceof BillingError || error instanceof RangeError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Unable to record the payment. Please try again." };
  }

  return { ok: true, data: undefined };
}

export async function refundPayment(
  actor: CurrentUser,
  input: RefundInput,
): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "payment.refund")) {
    return { ok: false, message: "You do not have permission to refund payments." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const payment = await transaction.payment.findFirst({
        where: { id: input.paymentId, ...accessiblePaymentWhere(actor) },
        select: {
          id: true,
          amountMinor: true,
          invoice: {
            select: {
              id: true,
              status: true,
              totalMinor: true,
              paidMinor: true,
            },
          },
          refunds: { select: { amountMinor: true } },
        },
      });
      if (!payment || payment.invoice.status === "VOID") {
        throw new BillingError("Payment access was not found or it cannot be refunded.");
      }

      const refundedMinor = payment.refunds.reduce((total, refund) => total + refund.amountMinor, 0);
      const remainingMinor = payment.amountMinor - refundedMinor;
      if (input.amountMinor > remainingMinor) {
        throw new BillingError("Refund cannot exceed the remaining refundable payment amount.");
      }

      const settlement = calculateInvoiceSettlement(
        payment.invoice.totalMinor,
        payment.invoice.paidMinor - input.amountMinor,
      );
      const updated = await transaction.invoice.updateMany({
        where: {
          id: payment.invoice.id,
          status: { in: ["PAID", "PARTIALLY_PAID"] },
          paidMinor: payment.invoice.paidMinor,
        },
        data: settlement,
      });
      if (updated.count !== 1) {
        throw new BillingError("This invoice changed before the refund was recorded. Refresh and try again.");
      }

      const refund = await transaction.refund.create({
        data: {
          paymentId: payment.id,
          amountMinor: input.amountMinor,
          reason: input.reason,
          createdById: actor.id,
        },
        select: { id: true },
      });
      const newRefundedMinor = refundedMinor + input.amountMinor;
      await transaction.payment.update({
        where: { id: payment.id },
        data: { status: paymentStatus(newRefundedMinor, payment.amountMinor) },
      });
      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "PAYMENT_REFUNDED",
        entityType: "Refund",
        entityId: refund.id,
        before: { paymentId: payment.id, refundedMinor },
        after: {
          paymentId: payment.id,
          amountMinor: input.amountMinor,
          refundedMinor: newRefundedMinor,
          balanceMinor: settlement.balanceMinor,
          reason: input.reason,
        },
      });
    });
  } catch (error) {
    if (error instanceof BillingError || error instanceof RangeError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Unable to record the refund. Please try again." };
  }

  return { ok: true, data: undefined };
}

export async function voidInvoice(
  actor: CurrentUser,
  input: InvoiceAccessInput,
): Promise<ServiceResult<undefined>> {
  if (!hasPermission(actor, "invoice.void")) {
    return { ok: false, message: "You do not have permission to void invoices." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const invoice = await transaction.invoice.findFirst({
        where: { id: input.invoiceId, ...accessibleInvoiceWhere(actor) },
        select: {
          id: true,
          status: true,
          totalMinor: true,
          paidMinor: true,
          balanceMinor: true,
        },
      });
      if (!invoice || invoice.status === "VOID") {
        throw new BillingError("Invoice access was not found or it has already been voided.");
      }
      if (invoice.paidMinor !== 0) {
        throw new BillingError("Refund all payments before voiding this invoice.");
      }

      const updated = await transaction.invoice.updateMany({
        where: { id: invoice.id, status: invoice.status, paidMinor: 0 },
        data: { status: "VOID", balanceMinor: 0 },
      });
      if (updated.count !== 1) {
        throw new BillingError("This invoice changed before it was voided. Refresh and try again.");
      }

      await writeAuditLog(transaction, {
        actorUserId: actor.id,
        action: "INVOICE_VOIDED",
        entityType: "Invoice",
        entityId: invoice.id,
        before: {
          status: invoice.status,
          totalMinor: invoice.totalMinor,
          balanceMinor: invoice.balanceMinor,
        },
        after: { status: "VOID", reason: input.reason },
      });
    });
  } catch (error) {
    if (error instanceof BillingError) return { ok: false, message: error.message };
    return { ok: false, message: "Unable to void the invoice. Please try again." };
  }

  return { ok: true, data: undefined };
}

export async function getInvoice(actor: CurrentUser, invoiceId: string) {
  if (!hasPermission(actor, "invoice.read")) return null;

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, ...accessibleInvoiceWhere(actor) },
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      status: true,
      subtotalMinor: true,
      discountMinor: true,
      taxMinor: true,
      totalMinor: true,
      paidMinor: true,
      balanceMinor: true,
      member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
      branch: { select: { name: true } },
      items: {
        select: { id: true, description: true, quantity: true, unitPriceMinor: true, totalMinor: true },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        select: {
          id: true,
          amountMinor: true,
          method: true,
          reference: true,
          paidAt: true,
          status: true,
          refunds: { select: { amountMinor: true, reason: true, createdAt: true } },
        },
      },
    },
  });
  if (!invoice) return null;

  return {
    ...invoice,
    payments: invoice.payments.map((payment) => {
      const refundedMinor = payment.refunds.reduce((total, refund) => total + refund.amountMinor, 0);
      return { ...payment, refundedMinor, netMinor: payment.amountMinor - refundedMinor };
    }),
  };
}

export async function listInvoices(actor: CurrentUser) {
  if (!hasPermission(actor, "invoice.read")) return [];

  return prisma.invoice.findMany({
    where: accessibleInvoiceWhere(actor),
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      invoiceNumber: true,
      issueDate: true,
      status: true,
      totalMinor: true,
      paidMinor: true,
      balanceMinor: true,
      member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
      branch: { select: { name: true } },
    },
  });
}

export async function listDailyPayments(
  actor: CurrentUser,
  input: { day: Date; method?: PaymentMethod },
) {
  if (!hasPermission(actor, "invoice.read")) return [];

  const start = new Date(Date.UTC(
    input.day.getUTCFullYear(),
    input.day.getUTCMonth(),
    input.day.getUTCDate(),
  ));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const payments = await prisma.payment.findMany({
    where: {
      ...accessiblePaymentWhere(actor),
      paidAt: { gte: start, lt: end },
      ...(input.method ? { method: input.method } : {}),
    },
    orderBy: { paidAt: "desc" },
    select: {
      id: true,
      amountMinor: true,
      method: true,
      reference: true,
      paidAt: true,
      status: true,
      member: { select: { id: true, firstName: true, lastName: true, memberCode: true } },
      invoice: { select: { id: true, invoiceNumber: true } },
      refunds: { select: { amountMinor: true } },
    },
  });

  return payments.map((payment) => {
    const refundedMinor = payment.refunds.reduce((total, refund) => total + refund.amountMinor, 0);
    return { ...payment, refundedMinor, netMinor: payment.amountMinor - refundedMinor };
  });
}
