export type ExceptionCategory =
  | 'normal'
  | 'amount_mismatch'
  | 'missing_settlement'
  | 'missing_bank_credit'
  | 'duplicate_payment'
  | 'timing_difference'
  | 'utr_mismatch'
  | 'fee_calculation_error'

export interface ScenarioDefinition {
  index: number
  category: ExceptionCategory
  description: string
  grossAmount: number // in paise (INR)
  fee: number // in paise
  tax: number // in paise
  adjustment: number // in paise
  daysToBankCredit: number // days offset from settlement processed date
  customUtr?: string
  bankUtrOverride?: string
  bankAmountOverride?: number
  omitSettlement?: boolean
  omitBankCredit?: boolean
  duplicateSettlementItem?: boolean
  corruptSettlementArithmetic?: boolean
}

export interface SyntheticOrderInput {
  id: string
  batchId: string
  createdAt: Date
}

export interface SyntheticPaymentInput {
  id: string
  batchId: string
  orderId: string
  amount: number
  status: string
  createdAt: Date
}

export interface SyntheticSettlementInput {
  id: string
  batchId: string
  utr: string | null
  status: string
  amount: number
  createdAt: Date
}

export interface SyntheticSettlementItemInput {
  id: string
  batchId: string
  settlementId: string | null
  paymentId: string | null
  type: string
  grossAmount: number
  fee: number
  tax: number
  netAmount: number
}

export interface SyntheticBankTransactionInput {
  id: string
  batchId: string
  utr: string | null
  amount: number
  type: string
  transactionDate: Date
}

export interface SyntheticGroundTruthInput {
  id: string
  batchId: string
  recordType: string
  recordId: string
  expectedStatus: 'matched' | 'exception'
  expectedExceptionType: ExceptionCategory | null
}

export interface SyntheticBatchData {
  batchId: string
  orders: SyntheticOrderInput[]
  payments: SyntheticPaymentInput[]
  settlements: SyntheticSettlementInput[]
  settlementItems: SyntheticSettlementItemInput[]
  bankTransactions: SyntheticBankTransactionInput[]
  groundTruth: SyntheticGroundTruthInput[]
}
