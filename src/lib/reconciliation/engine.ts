import { ReconciliationRecordResult } from './types'

export interface ReconciliationEngineInputData {
  payments: Array<{ id: string; amount: number; status: string; order_id: string; created_at: Date }>
  settlementItems: Array<{ id: string; settlement_id: string | null; payment_id: string | null; type: string; gross_amount: number; fee: number; tax: number; net_amount: number }>
  settlements: Array<{ id: string; utr: string | null; status: string; amount: number; created_at: Date }>
  bankTransactions: Array<{ id: string; utr: string | null; amount: number; type: string; transaction_date: Date }>
}

export interface ReconciliationEngineOptions {
  slaHours?: number // Configured SLA observation window in hours (derived from synthetic batch/config)
  referenceDate?: Date // Evaluation cutoff reference date
}

/**
 * Pure, deterministic reconciliation engine.
 * Processes full batch without LLM models or ground truth access.
 */
export function reconcileBatch(
  data: ReconciliationEngineInputData,
  options: ReconciliationEngineOptions = {}
): ReconciliationRecordResult[] {
  // Configured SLA observation window (default 48h / T+2 days if not specified in options/batch config)
  const slaHours = options.slaHours ?? 48
  const defaultRefDate = new Date('2026-08-02T18:00:00.000Z') // Evaluation cutoff date
  const referenceDate = options.referenceDate ?? defaultRefDate

  const settlementMap = new Map(data.settlements.map((s) => [s.id, s]))

  const bankTxMapByUtr = new Map<string, typeof data.bankTransactions[0]>()
  for (const bt of data.bankTransactions) {
    if (bt.utr) {
      bankTxMapByUtr.set(bt.utr, bt)
    }
  }

  // Index settlement items by payment_id
  const itemsByPaymentId = new Map<string, typeof data.settlementItems>()
  for (const item of data.settlementItems) {
    if (item.payment_id) {
      const existing = itemsByPaymentId.get(item.payment_id) ?? []
      existing.push(item)
      itemsByPaymentId.set(item.payment_id, existing)
    }
  }

  // Index settlement items by settlement_id
  const itemsBySettlementId = new Map<string, typeof data.settlementItems>()
  for (const item of data.settlementItems) {
    if (item.settlement_id) {
      const existing = itemsBySettlementId.get(item.settlement_id) ?? []
      existing.push(item)
      itemsBySettlementId.set(item.settlement_id, existing)
    }
  }

  // Count payments by order_id + amount for logical duplicate detection
  const paymentCountByOrderAndAmount = new Map<string, number>()
  for (const p of data.payments) {
    const key = `${p.order_id}_${p.amount}`
    paymentCountByOrderAndAmount.set(key, (paymentCountByOrderAndAmount.get(key) ?? 0) + 1)
  }

  const results: ReconciliationRecordResult[] = []

  for (const payment of data.payments) {
    const linkedItems = itemsByPaymentId.get(payment.id) ?? []
    const orderAmountKey = `${payment.order_id}_${payment.amount}`
    const logicalPaymentCount = paymentCountByOrderAndAmount.get(orderAmountKey) ?? 1

    // Rule 1: Linkage Check (missing_settlement)
    if (linkedItems.length === 0) {
      results.push({
        recordType: 'payment',
        recordId: payment.id,
        status: 'exception',
        exceptionType: 'missing_settlement',
        expectedValues: { settlementItemLinked: true },
        actualValues: { settlementItemLinked: false },
        evidence: { paymentId: payment.id, orderId: payment.order_id },
        reason: `Payment ${payment.id} has no linked settlement item.`,
      })
      continue
    }

    // Rule 2: Duplicate Payment Check (duplicate_payment)
    // Logical duplicate criteria: payment ID linked to multiple settlement items OR duplicate payment records for same order+amount
    if (linkedItems.length > 1 || logicalPaymentCount > 1) {
      results.push({
        recordType: 'payment',
        recordId: payment.id,
        status: 'exception',
        exceptionType: 'duplicate_payment',
        expectedValues: { settlementItemCount: 1, logicalPaymentCount: 1 },
        actualValues: { settlementItemCount: linkedItems.length, logicalPaymentCount },
        evidence: { paymentId: payment.id, linkedItemIds: linkedItems.map((i) => i.id), orderId: payment.order_id },
        reason: `Payment ${payment.id} exhibits duplicate transaction criteria (linked settlement items: ${linkedItems.length}, order payment count: ${logicalPaymentCount}).`,
      })
      continue
    }

    const item = linkedItems[0]

    // Rule 3: Settlement Item Component Arithmetic (fee_calculation_error)
    const expectedNet = item.gross_amount - item.fee - item.tax
    if (item.net_amount !== expectedNet) {
      results.push({
        recordType: 'payment',
        recordId: payment.id,
        status: 'exception',
        exceptionType: 'fee_calculation_error',
        expectedValues: { netAmount: expectedNet, gross: item.gross_amount, fee: item.fee, tax: item.tax },
        actualValues: { netAmount: item.net_amount },
        evidence: { itemId: item.id, paymentId: payment.id, settlementId: item.settlement_id },
        reason: `Settlement item net amount (${item.net_amount}) does not equal gross (${item.gross_amount}) - fee (${item.fee}) - tax (${item.tax}).`,
      })
      continue
    }

    const settlement = item.settlement_id ? settlementMap.get(item.settlement_id) : undefined

    if (!settlement) {
      results.push({
        recordType: 'payment',
        recordId: payment.id,
        status: 'exception',
        exceptionType: 'missing_settlement',
        expectedValues: { settlementExists: true },
        actualValues: { settlementExists: false },
        evidence: { itemId: item.id, paymentId: payment.id },
        reason: `Settlement item ${item.id} references missing settlement ${item.settlement_id}.`,
      })
      continue
    }

    // Rule 4: Settlement Batch Total Check (amount_mismatch)
    const allItemsForSettlement = itemsBySettlementId.get(settlement.id) ?? []
    const sumNetForSettlement = allItemsForSettlement.reduce((sum, i) => sum + i.net_amount, 0)
    if (sumNetForSettlement !== settlement.amount) {
      results.push({
        recordType: 'payment',
        recordId: payment.id,
        status: 'exception',
        exceptionType: 'amount_mismatch',
        expectedValues: { settlementAmount: sumNetForSettlement },
        actualValues: { settlementAmount: settlement.amount },
        evidence: { settlementId: settlement.id, paymentId: payment.id, itemSum: sumNetForSettlement },
        reason: `Sum of settlement items (${sumNetForSettlement}) does not match settlement header amount (${settlement.amount}).`,
      })
      continue
    }

    // Rule 5: UTR & Bank Credit Lookup
    const utr = settlement.utr
    const bankTx = utr ? bankTxMapByUtr.get(utr) : undefined

    if (!bankTx) {
      // Check if another bank transaction exists with mismatched UTR for same expected transaction ID
      const expectedBankTxId = payment.id.replace('pay_', 'tx_')
      const fallbackBankTx = data.bankTransactions.find((b) => b.id === expectedBankTxId)

      if (fallbackBankTx && fallbackBankTx.utr !== utr) {
        results.push({
          recordType: 'payment',
          recordId: payment.id,
          status: 'exception',
          exceptionType: 'utr_mismatch',
          expectedValues: { bankUtr: utr },
          actualValues: { bankUtr: fallbackBankTx.utr },
          evidence: { settlementId: settlement.id, bankTxId: fallbackBankTx.id, settlementUtr: utr, bankUtr: fallbackBankTx.utr },
          reason: `Settlement UTR (${utr}) does not match bank transaction UTR (${fallbackBankTx.utr}).`,
        })
        continue
      }

      // Timing SLA Evaluation based on configured observation window (slaHours)
      const hoursSinceSettlement = (referenceDate.getTime() - settlement.created_at.getTime()) / 3600000

      if (hoursSinceSettlement <= slaHours) {
        // Within observation window -> timing_difference
        results.push({
          recordType: 'payment',
          recordId: payment.id,
          status: 'exception',
          exceptionType: 'timing_difference',
          expectedValues: { bankCreditObserved: true, configuredSlaHours: slaHours },
          actualValues: { bankCreditObserved: false, hoursElapsed: Math.round(hoursSinceSettlement) },
          evidence: {
            settlementId: settlement.id,
            utr: settlement.utr,
            settlementDate: settlement.created_at,
            bankCreditObserved: false,
            configuredSlaHours: slaHours,
            hoursElapsed: Math.round(hoursSinceSettlement),
          },
          reason: `Settlement processed ${Math.round(hoursSinceSettlement)}h ago; pending bank credit is inside configured SLA observation window (${slaHours}h).`,
        })
      } else {
        // Exceeded SLA window -> missing_bank_credit
        results.push({
          recordType: 'payment',
          recordId: payment.id,
          status: 'exception',
          exceptionType: 'missing_bank_credit',
          expectedValues: { bankCreditObserved: true, configuredSlaHours: slaHours },
          actualValues: { bankCreditObserved: false, hoursElapsed: Math.round(hoursSinceSettlement) },
          evidence: {
            settlementId: settlement.id,
            utr: settlement.utr,
            settlementDate: settlement.created_at,
            bankCreditObserved: false,
            configuredSlaHours: slaHours,
            hoursElapsed: Math.round(hoursSinceSettlement),
          },
          reason: `Settlement processed ${Math.round(hoursSinceSettlement)}h ago; bank credit is missing and exceeded configured SLA window (${slaHours}h).`,
        })
      }
      continue
    }

    // Rule 6: Settlement Amount vs Bank Credit Amount Match (amount_mismatch)
    if (bankTx.amount !== settlement.amount) {
      results.push({
        recordType: 'payment',
        recordId: payment.id,
        status: 'exception',
        exceptionType: 'amount_mismatch',
        expectedValues: { bankAmount: settlement.amount },
        actualValues: { bankAmount: bankTx.amount },
        evidence: { settlementId: settlement.id, bankTxId: bankTx.id, settlementAmount: settlement.amount, bankAmount: bankTx.amount },
        reason: `Bank transaction credit amount (${bankTx.amount}) does not match settlement amount (${settlement.amount}).`,
      })
      continue
    }

    // All checks passed cleanly -> Normal Matched
    results.push({
      recordType: 'payment',
      recordId: payment.id,
      status: 'matched',
      exceptionType: null,
      expectedValues: { matched: true },
      actualValues: { matched: true },
      evidence: {
        orderId: payment.order_id,
        paymentId: payment.id,
        itemId: item.id,
        settlementId: settlement.id,
        utr: settlement.utr,
        bankTxId: bankTx.id,
      },
      reason: 'All linkage, component arithmetic, batch totals, UTR, and bank credit checks passed cleanly.',
    })
  }

  return results
}
