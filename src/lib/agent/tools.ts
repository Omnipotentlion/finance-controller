import { prisma } from '../db'
import { reconcileBatch } from '../reconciliation/engine'

/**
 * AI AGENT TOOL 1: Get basic transaction context for a payment ID.
 * Strictly NO access to GroundTruth table.
 */
export async function getTransactionContext(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
      items: {
        include: {
          settlement: true,
        },
      },
    },
  })

  if (!payment) {
    return { error: `Payment ${paymentId} not found.` }
  }

  return {
    paymentId: payment.id,
    orderId: payment.order_id,
    amount: payment.amount,
    status: payment.status,
    createdAt: payment.created_at,
    orderCreatedAt: payment.order?.created_at,
    linkedItemCount: payment.items.length,
  }
}

/**
 * AI AGENT TOOL 2: Fetch full multi-source linkage across Payment -> Settlement Item -> Settlement -> Bank Transaction.
 */
export async function getRelatedRecords(paymentId: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
      items: {
        include: {
          settlement: true,
        },
      },
    },
  })

  if (!payment) {
    return { error: `Payment ${paymentId} not found.` }
  }

  const utrs = payment.items
    .map((i) => i.settlement?.utr)
    .filter((utr): utr is string => Boolean(utr))

  const bankTransactions = utrs.length > 0
    ? await prisma.bankTransaction.findMany({
        where: { utr: { in: utrs } },
      })
    : []

  return {
    payment: {
      id: payment.id,
      batchId: payment.batch_id,
      orderId: payment.order_id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.created_at,
    },
    order: payment.order,
    settlementItems: payment.items.map((item) => ({
      id: item.id,
      settlementId: item.settlement_id,
      grossAmount: item.gross_amount,
      fee: item.fee,
      tax: item.tax,
      netAmount: item.net_amount,
      type: item.type,
    })),
    settlements: payment.items
      .map((i) => i.settlement)
      .filter(Boolean),
    bankTransactions,
  }
}

/**
 * AI AGENT TOOL 3: Re-run deterministic check on demand for a record ID.
 */
export async function runReconciliationCheck(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) return { error: `Payment ${paymentId} not found.` }

  const batchId = payment.batch_id
  const payments = await prisma.payment.findMany({ where: { batch_id: batchId } })
  const settlementItems = await prisma.settlementItem.findMany({ where: { batch_id: batchId } })
  const settlements = await prisma.settlement.findMany({ where: { batch_id: batchId } })
  const bankTransactions = await prisma.bankTransaction.findMany({ where: { batch_id: batchId } })

  const results = reconcileBatch({
    payments,
    settlementItems,
    settlements,
    bankTransactions,
  })

  const check = results.find((r) => r.recordId === paymentId)
  return check ?? { error: `Reconciliation check for ${paymentId} failed to run.` }
}

/**
 * AI AGENT TOOL 4: Compare expected vs actual values for an exception record.
 */
export async function compareExpectedVsActual(paymentId: string) {
  const check = await runReconciliationCheck(paymentId)
  if ('error' in check) return check

  return {
    recordId: paymentId,
    exceptionType: check.exceptionType,
    expectedValues: check.expectedValues,
    actualValues: check.actualValues,
    evidence: check.evidence,
    reason: check.reason,
  }
}
