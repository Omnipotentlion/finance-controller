import { SCENARIO_MANIFEST } from './manifest'
import {
  SyntheticBankTransactionInput,
  SyntheticBatchData,
  SyntheticGroundTruthInput,
  SyntheticOrderInput,
  SyntheticPaymentInput,
  SyntheticSettlementInput,
  SyntheticSettlementItemInput,
} from './types'

/**
 * Deterministically generates synthetic dataset records and locked ground truth
 * for a target batch based on the SCENARIO_MANIFEST.
 */
export function generateSyntheticBatch(batchId: string = 'batch_2026_01'): SyntheticBatchData {
  const baseDate = new Date('2026-08-01T10:00:00.000Z')

  const orders: SyntheticOrderInput[] = []
  const payments: SyntheticPaymentInput[] = []
  const settlements: SyntheticSettlementInput[] = []
  const settlementItems: SyntheticSettlementItemInput[] = []
  const bankTransactions: SyntheticBankTransactionInput[] = []
  const groundTruth: SyntheticGroundTruthInput[] = []

  for (const scenario of SCENARIO_MANIFEST) {
    const idxStr = String(scenario.index).padStart(2, '0')

    const orderId = `ord_${batchId}_${idxStr}`
    const paymentId = `pay_${batchId}_${idxStr}`
    const settlementId = `set_${batchId}_${idxStr}`
    const itemId = `item_${batchId}_${idxStr}`
    const utr = scenario.customUtr ?? `UTR${batchId.toUpperCase()}${idxStr}`
    const bankTxId = `tx_${batchId}_${idxStr}`

    // 1. Order Record
    const orderCreatedAt = new Date(baseDate.getTime() + scenario.index * 60000)
    orders.push({
      id: orderId,
      batchId,
      createdAt: orderCreatedAt,
    })

    // 2. Payment Record
    const paymentCreatedAt = new Date(orderCreatedAt.getTime() + 5000)
    payments.push({
      id: paymentId,
      batchId,
      orderId,
      amount: scenario.grossAmount,
      status: 'captured',
      createdAt: paymentCreatedAt,
    })

    // Calculate component arithmetic
    const calculatedNet = scenario.grossAmount + scenario.adjustment - scenario.fee - scenario.tax
    const netAmount = scenario.corruptSettlementArithmetic
      ? calculatedNet + 50000 // Plant 500 INR arithmetic error
      : calculatedNet

    // 3. Settlement & Settlement Items (unless omitted)
    if (!scenario.omitSettlement) {
      const DAY_MS = 86400000

      const settlementCreatedAt =
        scenario.category === 'missing_bank_credit'
          ? new Date(baseDate.getTime() - scenario.daysToBankCredit * DAY_MS)
          : new Date(paymentCreatedAt.getTime() + DAY_MS) // T+1 day

      settlements.push({
        id: settlementId,
        batchId,
        utr,
        status: 'processed',
        amount: netAmount,
        createdAt: settlementCreatedAt,
      })

      settlementItems.push({
        id: itemId,
        batchId,
        settlementId,
        paymentId,
        type: 'payment',
        grossAmount: scenario.grossAmount,
        fee: scenario.fee,
        tax: scenario.tax,
        netAmount,
      })

      // Duplicate payment exception scenario
      if (scenario.duplicateSettlementItem) {
        settlementItems.push({
          id: `${itemId}_dup`,
          batchId,
          settlementId,
          paymentId, // Same payment ID linked twice
          type: 'payment',
          grossAmount: scenario.grossAmount,
          fee: scenario.fee,
          tax: scenario.tax,
          netAmount,
        })
      }

      // 4. Bank Transaction Record (unless omitted)
      if (!scenario.omitBankCredit) {
        const bankTxDate = new Date(settlementCreatedAt.getTime() + scenario.daysToBankCredit * 86400000)
        const bankUtr = scenario.bankUtrOverride ?? utr
        const bankAmount = scenario.bankAmountOverride ?? netAmount

        bankTransactions.push({
          id: bankTxId,
          batchId,
          utr: bankUtr,
          amount: bankAmount,
          type: 'credit',
          transactionDate: bankTxDate,
        })
      }
    }

    // 5. Ground Truth Label Entry
    const isMatched = scenario.category === 'normal'
    groundTruth.push({
      id: `gt_${batchId}_${idxStr}`,
      batchId,
      recordType: 'payment',
      recordId: paymentId,
      expectedStatus: isMatched ? 'matched' : 'exception',
      expectedExceptionType: isMatched ? null : scenario.category,
    })
  }

  return {
    batchId,
    orders,
    payments,
    settlements,
    settlementItems,
    bankTransactions,
    groundTruth,
  }
}
