import { prisma } from '../db'
import { generateSyntheticBatch } from './generator'
import { SyntheticBatchData } from './types'

/**
 * Persists a synthetic batch dataset to the PostgreSQL database.
 * Uses batch_id versioning to isolate batches and ensure atomic ingestion.
 */
export async function seedSyntheticBatch(batchData?: SyntheticBatchData): Promise<SyntheticBatchData> {
  const batch = batchData ?? generateSyntheticBatch()
  const { batchId } = batch

  await prisma.$transaction(async (tx) => {
    // Clean up any existing data for this specific batch_id (idempotent seed)
    await tx.groundTruth.deleteMany({ where: { batch_id: batchId } })
    await tx.reconciliationResult.deleteMany({ where: { batch_id: batchId } })
    await tx.bankTransaction.deleteMany({ where: { batch_id: batchId } })
    await tx.settlementItem.deleteMany({ where: { batch_id: batchId } })
    await tx.settlement.deleteMany({ where: { batch_id: batchId } })
    await tx.payment.deleteMany({ where: { batch_id: batchId } })
    await tx.order.deleteMany({ where: { batch_id: batchId } })

    // 1. Orders
    await tx.order.createMany({
      data: batch.orders.map((o) => ({
        id: o.id,
        batch_id: o.batchId,
        created_at: o.createdAt,
      })),
    })

    // 2. Payments
    await tx.payment.createMany({
      data: batch.payments.map((p) => ({
        id: p.id,
        batch_id: p.batchId,
        order_id: p.orderId,
        amount: p.amount,
        status: p.status,
        created_at: p.createdAt,
      })),
    })

    // 3. Settlements
    await tx.settlement.createMany({
      data: batch.settlements.map((s) => ({
        id: s.id,
        batch_id: s.batchId,
        utr: s.utr,
        status: s.status,
        amount: s.amount,
        created_at: s.createdAt,
      })),
    })

    // 4. Settlement Items
    await tx.settlementItem.createMany({
      data: batch.settlementItems.map((si) => ({
        id: si.id,
        batch_id: si.batchId,
        settlement_id: si.settlementId,
        payment_id: si.paymentId,
        type: si.type,
        gross_amount: si.grossAmount,
        fee: si.fee,
        tax: si.tax,
        net_amount: si.netAmount,
      })),
    })

    // 5. Bank Transactions
    await tx.bankTransaction.createMany({
      data: batch.bankTransactions.map((bt) => ({
        id: bt.id,
        batch_id: bt.batchId,
        utr: bt.utr,
        amount: bt.amount,
        type: bt.type,
        transaction_date: bt.transactionDate,
      })),
    })

    // 6. Locked Ground Truth Isolation Table
    await tx.groundTruth.createMany({
      data: batch.groundTruth.map((gt) => ({
        id: gt.id,
        batch_id: gt.batchId,
        record_type: gt.recordType,
        record_id: gt.recordId,
        expected_status: gt.expectedStatus,
        expected_exception_type: gt.expectedExceptionType,
      })),
    })
  })

  return batch
}
