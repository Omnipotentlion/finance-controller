import { prisma } from '../db'
import { reconcileBatch, ReconciliationEngineOptions } from './engine'
import { BatchReconciliationSummary, ReconciliationRecordResult } from './types'

/**
 * Runs the deterministic reconciliation engine for an entire batch of records.
 * Fetches application data from DB, runs reconciliation, and persists results.
 */
export async function runBatchReconciliation(
  batchId: string = 'batch_2026_01',
  options: ReconciliationEngineOptions = {}
): Promise<BatchReconciliationSummary> {
  // 1. Fetch application data for the batch
  const payments = await prisma.payment.findMany({ where: { batch_id: batchId } })
  const settlementItems = await prisma.settlementItem.findMany({ where: { batch_id: batchId } })
  const settlements = await prisma.settlement.findMany({ where: { batch_id: batchId } })
  const bankTransactions = await prisma.bankTransaction.findMany({ where: { batch_id: batchId } })

  // 2. Execute deterministic engine
  const records: ReconciliationRecordResult[] = reconcileBatch(
    {
      payments,
      settlementItems,
      settlements,
      bankTransactions,
    },
    options
  )

  // 3. Persist results into database (atomic replace per batch)
  await prisma.$transaction(async (tx) => {
    await tx.reconciliationResult.deleteMany({ where: { batch_id: batchId } })

    await tx.reconciliationResult.createMany({
      data: records.map((r) => ({
        batch_id: batchId,
        record_type: r.recordType,
        record_id: r.recordId,
        status: r.status,
        exception_type: r.exceptionType,
        ai_explanation: null, // Will be filled in Milestone 3 by AI agent
        ai_resolution_reason: null,
      })),
    })
  })

  const matchedCount = records.filter((r) => r.status === 'matched').length
  const exceptionCount = records.filter((r) => r.status === 'exception').length

  return {
    batchId,
    totalRecords: records.length,
    matchedCount,
    exceptionCount,
    records,
  }
}

/**
 * Fetches stored reconciliation results for a batch from the database.
 */
export async function getStoredReconciliationResults(batchId: string) {
  return prisma.reconciliationResult.findMany({
    where: { batch_id: batchId },
  })
}
