import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { generateSyntheticBatch } from '../src/lib/synthetic/generator'
import { SCENARIO_MANIFEST } from '../src/lib/synthetic/manifest'
import { seedSyntheticBatch } from '../src/lib/synthetic/seeder'
import { getBatchPayments, getBatchOrders, getBatchSettlements, getBatchBankTransactions, prisma } from '../src/lib/db'
import { getBatchGroundTruth } from '../src/lib/evaluation/groundTruthDb'

async function runTests() {
  console.log('=== RUNNING MILESTONE 1 SYNTHETIC DATA TESTS ===\n')

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
    // 1. Generator Unit Tests
    const batchData = generateSyntheticBatch('batch_test_60')

    assert(batchData.payments.length === 60, 'Exactly 60 primary payment records are generated for the batch')
    assert(batchData.orders.length === 60, 'Exactly 60 order records are generated for the batch')
    assert(batchData.groundTruth.length === 60, 'Ground truth contains exactly 60 record entries')

    // 2. Planted Exception Scenarios Presence
    const categories = SCENARIO_MANIFEST.map((s) => s.category)
    assert(categories.filter((c) => c === 'normal').length === 42, 'Manifest contains 42 normal records')
    assert(categories.filter((c) => c === 'amount_mismatch').length === 3, 'Manifest contains 3 amount_mismatch records')
    assert(categories.filter((c) => c === 'missing_settlement').length === 3, 'Manifest contains 3 missing_settlement records')
    assert(categories.filter((c) => c === 'missing_bank_credit').length === 3, 'Manifest contains 3 missing_bank_credit records')
    assert(categories.filter((c) => c === 'timing_difference').length === 3, 'Manifest contains 3 timing_difference records')
    assert(categories.filter((c) => c === 'duplicate_payment').length === 2, 'Manifest contains 2 duplicate_payment records')
    assert(categories.filter((c) => c === 'utr_mismatch').length === 2, 'Manifest contains 2 utr_mismatch records')
    assert(categories.filter((c) => c === 'fee_calculation_error').length === 2, 'Manifest contains 2 fee_calculation_error records')

    // 3. Monetary Fields Validation
    const allAmountsAreIntegers = batchData.payments.every((p) => Number.isInteger(p.amount) && p.amount > 0) &&
      batchData.settlementItems.every((si) => Number.isInteger(si.grossAmount) && Number.isInteger(si.fee) && Number.isInteger(si.tax) && Number.isInteger(si.netAmount))
    assert(allAmountsAreIntegers, 'All monetary fields are positive valid integers representing paise')

    // 4. Fixed Seed Reproducibility
    const batchData2 = generateSyntheticBatch('batch_test_60')
    assert(JSON.stringify(batchData) === JSON.stringify(batchData2), 'Fixed seed generator produces 100% reproducible data')

    // 5. Database Integration & Seeding Test
    console.log('\nTesting Database Persistence and Isolation...')
    await seedSyntheticBatch(batchData)

    const dbPayments = await getBatchPayments('batch_test_60')
    assert(dbPayments.length === 60, 'Database query retrieves exactly 60 payments for batch')

    const dbOrders = await getBatchOrders('batch_test_60')
    assert(dbOrders.length === 60, 'Database query retrieves 60 orders for batch')

    const dbSettlements = await getBatchSettlements('batch_test_60')
    assert(dbSettlements.length > 0, 'Database query retrieves settlements for non-omitted records')

    const dbBankTxs = await getBatchBankTransactions('batch_test_60')
    assert(dbBankTxs.length > 0, 'Database query retrieves bank transactions for non-omitted records')

    // 6. Ground Truth Database Isolation
    const groundTruthEntries = await getBatchGroundTruth('batch_test_60')
    assert(groundTruthEntries.length === 60, 'Evaluation harness retrieves exactly 60 ground truth records')

    const appDbExports = require('../src/lib/db')
    assert(!('getBatchGroundTruth' in appDbExports) && !('groundTruth' in appDbExports), 'Application DB exports do NOT expose ground truth retrieval functions')

    console.log(`\n=== TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`)
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

runTests()
