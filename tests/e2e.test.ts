import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

import { generateSyntheticBatch } from '../src/lib/synthetic/generator'
import { seedSyntheticBatch } from '../src/lib/synthetic/seeder'
import { runBatchReconciliation } from '../src/lib/reconciliation/service'
import { investigateRecord } from '../src/lib/agent/investigator'
import { evaluateBatch } from '../src/lib/evaluation/harness'
import { evaluateResolutionPolicy } from '../src/lib/resolution/engine'
import {
  getTransactionContext,
  getRelatedRecords,
} from '../src/lib/agent/tools'
import { prisma } from '../src/lib/db'

async function runEndToEndTests() {
  console.log(
    '=== RUNNING QUOTA-SAFE END-TO-END PIPELINE TESTS ===\n'
  )

  let passed = 0
  let failed = 0

  function assert(
    condition: boolean,
    message: string
  ) {
    if (condition) {
      console.log(`✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`✗ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // =====================================================
    // 1. SEED 60-RECORD SYNTHETIC BATCH
    // =====================================================

    const batchId = 'batch_e2e_60'

    const batchData =
      generateSyntheticBatch(batchId)

    await seedSyntheticBatch(batchData)

    assert(
      true,
      '1. Ingested 60-record synthetic batch into PostgreSQL database'
    )

    // =====================================================
    // 2. DETERMINISTIC RECONCILIATION
    // =====================================================

    const reconSummary =
      await runBatchReconciliation(
        batchId,
        {
          slaHours: 48,
          referenceDate:
            new Date(
              '2026-08-02T18:00:00.000Z'
            ),
        }
      )

    assert(
      reconSummary.totalRecords === 60,
      '2. Deterministic engine processed all 60 records'
    )

    assert(
      reconSummary.matchedCount === 42,
      '   Matched exactly 42 normal records (70.00% Match Rate)'
    )

    assert(
      reconSummary.exceptionCount === 18,
      '   Flagged exactly 18 initial exceptions'
    )

    // =====================================================
    // 3. AI AGENT TOOLING
    // =====================================================

    const timingException =
      await prisma.reconciliationResult.findFirst({
        where: {
          batch_id: batchId,
          exception_type: 'timing_difference',
        },
      })

    assert(
      !!timingException,
      '   Located a real timing_difference exception for AI testing'
    )

    if (!timingException) {
      throw new Error(
        'No timing_difference exception found in E2E batch'
      )
    }

    const paymentId = timingException.record_id

    const txContext =
      await getTransactionContext(
        paymentId
      )

    assert(
      'amount' in txContext,
      '3. AI Agent tool get_transaction_context retrieved payment data'
    )

    const related =
      await getRelatedRecords(
        paymentId
      )

    assert(
      'payment' in related,
      '   AI Agent tool get_related_records retrieved multi-source records'
    )

    // =====================================================
    // 4. DETERMINISTIC RESOLUTION SAFETY
    // =====================================================

    const timingDecision = evaluateResolutionPolicy(
      'timing_difference',
      {
        configuredSlaHours: 48,
        hoursElapsed: 7,
        bankCreditObserved: false,
      },
      'auto_resolve'
    )
    assert(
      timingDecision.allowed &&
      timingDecision.finalStatus ===
      'auto_resolved',
      '4. Resolution policy allowed safe timing-difference auto-resolution'
    )

    const unsafeDecision =
      evaluateResolutionPolicy(
        'amount_mismatch',
        {},
        'auto_resolve'
      )

    assert(
      !unsafeDecision.allowed &&
      unsafeDecision.finalStatus ===
      'unresolved',
      '   Resolution policy BLOCKED unsafe amount_mismatch auto-resolution'
    )

    // =====================================================
    // 5. SINGLE-RECORD AI INVESTIGATION
    //
    // IMPORTANT:
    // This intentionally makes ONE Gemini request only.
    //
    // We do NOT call investigateBatchExceptions().
    // =====================================================

    console.log(
      '\nRunning SINGLE AI Investigation...'
    )

    const investigation =
      await investigateRecord(
        paymentId
      )

    assert(
      !!investigation,
      '5. AI Agent successfully investigated one exception record'
    )

    assert(
      investigation.paymentId ===
      paymentId,
      '   AI investigation returned the correct payment ID'
    )

    assert(
      typeof investigation.finalStatus ===
      'string',
      '   AI investigation produced a final resolution status'
    )

    console.log(
      `   AI Final Status: ${investigation.finalStatus}`
    )

    console.log(
      `   AI Proposed Resolution: ${investigation.proposedResolution}`
    )

    console.log(
      `   Policy Rule Applied: ${investigation.policyRuleApplied}`
    )

    // =====================================================
    // 6. EVALUATION HARNESS
    // =====================================================

    console.log(
      '\nRunning Evaluation Harness...'
    )

    const evalReport =
      await evaluateBatch(batchId)

    console.log(
      '\n=================================================='
    )

    console.log(
      '       END-TO-END EVALUATION METRICS REPORT'
    )

    console.log(
      '=================================================='
    )

    console.log(
      `Total Evaluated Records:       ${evalReport.totalRecords}`
    )

    console.log(
      `Matched Count:                 ${evalReport.matchedCount}`
    )

    console.log(
      `Deterministic Match Rate:      ${evalReport.matchRate.toFixed(2)}%`
    )

    console.log(
      `Exception Detection Precision: ${evalReport.precision.toFixed(2)}%`
    )

    console.log(
      `Exception Detection Recall:    ${evalReport.recall.toFixed(2)}%`
    )

    console.log(
      `True Positives (TP):           ${evalReport.truePositives}`
    )

    console.log(
      `True Negatives (TN):           ${evalReport.trueNegatives}`
    )

    console.log(
      `False Positives (FP):          ${evalReport.falsePositives}`
    )

    console.log(
      `False Negatives (FN):          ${evalReport.falseNegatives}`
    )

    console.log(
      '==================================================\n'
    )

    assert(
      evalReport.totalRecords === 60,
      '6. Evaluation harness verified complete 60-record batch'
    )

    assert(
      evalReport.recall >= 95,
      `   Exception Detection Recall: ${evalReport.recall.toFixed(2)}%`
    )

    assert(
      evalReport.precision >= 95,
      `   Exception Detection Precision: ${evalReport.precision.toFixed(2)}%`
    )

    // =====================================================
    // FINAL SUMMARY
    // =====================================================

    console.log(
      `=== E2E TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`
    )

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error(
      'Fatal E2E test exception:',
      err
    )

    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runEndToEndTests()