import { getBatchGroundTruth } from './groundTruthDb'
import { getStoredReconciliationResults } from '../reconciliation/service'
import { ReconciliationRecordResult } from '../reconciliation/types'

export interface EvaluationMetricsReport {
  batchId: string
  totalRecords: number
  matchedCount: number
  exceptionCount: number
  matchRate: number // Matched / total * 100
  precision: number // TP / (TP + FP) * 100
  recall: number // TP / (TP + FN) * 100
  truePositives: number
  falsePositives: number
  falseNegatives: number
  trueNegatives: number
  falsePositiveDetails: Array<{ recordId: string; expected: string | null; actual: string | null; reason: string }>
  falseNegativeDetails: Array<{ recordId: string; expected: string | null; actual: string | null; reason: string }>
}

/**
 * EVALUATION HARNESS ONLY: Evaluates reconciliation engine outputs against locked ground truth.
 * Computes match rate, precision, recall, and lists any false positives / negatives.
 */
export async function evaluateBatch(
  batchId: string = 'batch_2026_01',
  inMemoryResults?: ReconciliationRecordResult[]
): Promise<EvaluationMetricsReport> {
  const groundTruthList = await getBatchGroundTruth(batchId)
  const results = inMemoryResults ?? (await getStoredReconciliationResults(batchId)).map((r) => ({
    recordType: r.record_type as 'payment',
    recordId: r.record_id,
    status: r.status as 'matched' | 'exception',
    exceptionType: r.exception_type as any,
    expectedValues: {},
    actualValues: {},
    evidence: {},
    reason: r.ai_explanation ?? '',
  }))

  const groundTruthMap = new Map(groundTruthList.map((gt) => [gt.record_id, gt]))

  let truePositives = 0
  let falsePositives = 0
  let falseNegatives = 0
  let trueNegatives = 0

  const falsePositiveDetails: EvaluationMetricsReport['falsePositiveDetails'] = []
  const falseNegativeDetails: EvaluationMetricsReport['falseNegativeDetails'] = []

  for (const res of results) {
    const gt = groundTruthMap.get(res.recordId)

    if (!gt) {
      console.warn(`Ground truth missing for record ${res.recordId}`)
      continue
    }

    const isExpectedMatched = gt.expected_status === 'matched'
    const isActualMatched = res.status === 'matched'

    if (!isExpectedMatched && !isActualMatched) {
      // Both agree it's an exception
      if (res.exceptionType === gt.expected_exception_type) {
        truePositives++
      } else {
        // Exception type mismatch counted as false positive on classified exception type
        falsePositives++
        falsePositiveDetails.push({
          recordId: res.recordId,
          expected: gt.expected_exception_type,
          actual: res.exceptionType,
          reason: `Engine classified exception as ${res.exceptionType}, expected ${gt.expected_exception_type}`,
        })
      }
    } else if (isExpectedMatched && isActualMatched) {
      trueNegatives++
    } else if (isExpectedMatched && !isActualMatched) {
      // Expected matched, but actual was exception
      falsePositives++
      falsePositiveDetails.push({
        recordId: res.recordId,
        expected: 'matched',
        actual: res.exceptionType,
        reason: res.reason,
      })
    } else if (!isExpectedMatched && isActualMatched) {
      // Expected exception, but actual was matched
      falseNegatives++
      falseNegativeDetails.push({
        recordId: res.recordId,
        expected: gt.expected_exception_type,
        actual: 'matched',
        reason: res.reason,
      })
    }
  }

  const totalRecords = results.length
  const matchedCount = results.filter((r) => r.status === 'matched').length
  const exceptionCount = results.filter((r) => r.status === 'exception').length

  const matchRate = totalRecords > 0 ? (matchedCount / totalRecords) * 100 : 0
  const precisionDenominator = truePositives + falsePositives
  const recallDenominator = truePositives + falseNegatives

  const precision = precisionDenominator > 0 ? (truePositives / precisionDenominator) * 100 : 100
  const recall = recallDenominator > 0 ? (truePositives / recallDenominator) * 100 : 100

  return {
    batchId,
    totalRecords,
    matchedCount,
    exceptionCount,
    matchRate,
    precision,
    recall,
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    falsePositiveDetails,
    falseNegativeDetails,
  }
}
