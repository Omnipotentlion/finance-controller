import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { generateSyntheticBatch } from '../src/lib/synthetic/generator'
import { seedSyntheticBatch } from '../src/lib/synthetic/seeder'
import { runBatchReconciliation } from '../src/lib/reconciliation/service'
import { evaluateBatch } from '../src/lib/evaluation/harness'
import { prisma } from '../src/lib/db'

async function runReconciliationTests() {
  console.log('=== RUNNING MILESTONE 2 DETERMINISTIC RECONCILIATION TESTS ===\n')

  let passed = 0
  let failed = 0

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`)
      passed++
    } else {
      console.error(`✗ FAIL: ${message}`)
      failed++
    }
  }

  try {
    // 1. Seed Synthetic Batch 'batch_recon_60'
    const batchData = generateSyntheticBatch('batch_recon_60')
    await seedSyntheticBatch(batchData)
    assert(true, 'Seeded 60-record synthetic batch "batch_recon_60" into database')

    // 2. Run Deterministic Reconciliation Engine with configured SLA options
    console.log('\nRunning Deterministic Engine on 60-Record Batch...')
    const summary = await runBatchReconciliation('batch_recon_60', {
      slaHours: 48,
      referenceDate: new Date('2026-08-02T18:00:00.000Z'),
    })

    assert(summary.totalRecords === 60, 'Engine processed all 60 payment records')

    // 3. Exception Category Breakdown Verification
    const exceptionMap = new Map<string, number>()
    for (const rec of summary.records) {
      if (rec.exceptionType) {
        exceptionMap.set(rec.exceptionType, (exceptionMap.get(rec.exceptionType) ?? 0) + 1)
      }
    }

    console.log('\nDetected Exception Classification Breakdown:')
    console.log(`- Matched Normal:      ${summary.matchedCount}`)
    console.log(`- amount_mismatch:     ${exceptionMap.get('amount_mismatch') ?? 0}`)
    console.log(`- missing_settlement:  ${exceptionMap.get('missing_settlement') ?? 0}`)
    console.log(`- missing_bank_credit: ${exceptionMap.get('missing_bank_credit') ?? 0}`)
    console.log(`- timing_difference:   ${exceptionMap.get('timing_difference') ?? 0}`)
    console.log(`- duplicate_payment:   ${exceptionMap.get('duplicate_payment') ?? 0}`)
    console.log(`- utr_mismatch:        ${exceptionMap.get('utr_mismatch') ?? 0}`)
    console.log(`- fee_calculation_error: ${exceptionMap.get('fee_calculation_error') ?? 0}`)

    // 4. Database Persistence Check
    const storedResults = await prisma.reconciliationResult.findMany({ where: { batch_id: 'batch_recon_60' } })
    assert(storedResults.length === 60, 'Database persisted all 60 reconciliation results in ReconciliationResult table')

    // 5. Evaluation Harness Accuracy Check against Hidden Ground Truth
    console.log('\nEvaluating Engine Results against Locked Ground Truth...')
    const evalReport = await evaluateBatch('batch_recon_60', summary.records)

    console.log(`\n==============================================`)
    console.log(`         EVALUATION METRICS REPORT            `)
    console.log(`==============================================`)
    console.log(`Batch ID:               ${evalReport.batchId}`)
    console.log(`Total Records:          ${evalReport.totalRecords}`)
    console.log(`Matched Count:          ${evalReport.matchedCount}`)
    console.log(`Exception Count:        ${evalReport.exceptionCount}`)
    console.log(`Match Rate:             ${evalReport.matchRate.toFixed(2)}%`)
    console.log(`Precision:              ${evalReport.precision.toFixed(2)}%`)
    console.log(`Recall:                 ${evalReport.recall.toFixed(2)}%`)
    console.log(`True Positives (TP):    ${evalReport.truePositives}`)
    console.log(`True Negatives (TN):    ${evalReport.trueNegatives}`)
    console.log(`False Positives (FP):   ${evalReport.falsePositives}`)
    console.log(`False Negatives (FN):   ${evalReport.falseNegatives}`)

    if (evalReport.falsePositiveDetails.length > 0) {
      console.log('\n--- False Positives ---')
      evalReport.falsePositiveDetails.forEach((fp) => console.log(`  - [${fp.recordId}] Expected: ${fp.expected}, Actual: ${fp.actual} | ${fp.reason}`))
    }

    if (evalReport.falseNegativeDetails.length > 0) {
      console.log('\n--- False Negatives ---')
      evalReport.falseNegativeDetails.forEach((fn) => console.log(`  - [${fn.recordId}] Expected: ${fn.expected}, Actual: ${fn.actual} | ${fn.reason}`))
    }
    console.log(`==============================================\n`)

    assert(evalReport.totalRecords === 60, 'Evaluation harness calculated metrics for all 60 records')
    assert(evalReport.precision > 0, `Calculated actual Exception Precision: ${evalReport.precision.toFixed(2)}%`)
    assert(evalReport.recall > 0, `Calculated actual Exception Recall: ${evalReport.recall.toFixed(2)}%`)

    console.log(`=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal test exception:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

runReconciliationTests()
