import { ExceptionCategory } from '../synthetic/types'

export type ReconciliationStatus = 'matched' | 'exception'

export interface RuleCheckResult {
  passed: boolean
  exceptionType: ExceptionCategory | null
  expected: Record<string, any>
  actual: Record<string, any>
  evidence: Record<string, any>
  reason: string
}

export interface ReconciliationRecordResult {
  recordType: 'payment'
  recordId: string
  status: ReconciliationStatus
  exceptionType: ExceptionCategory | null
  expectedValues: Record<string, any>
  actualValues: Record<string, any>
  evidence: Record<string, any>
  reason: string
}

export interface BatchReconciliationSummary {
  batchId: string
  totalRecords: number
  matchedCount: number
  exceptionCount: number
  records: ReconciliationRecordResult[]
}
