import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { seedSyntheticBatch } from '../lib/synthetic/seeder'
import { prisma } from '../lib/db'

async function main() {
  console.log('Seeding synthetic batch dataset...')
  const batchId = process.argv[2] ?? 'batch_2026_01'
  const result = await seedSyntheticBatch(undefined)

  console.log(`Successfully seeded batch "${result.batchId}":`)
  console.log(`- Orders: ${result.orders.length}`)
  console.log(`- Payments: ${result.payments.length}`)
  console.log(`- Settlements: ${result.settlements.length}`)
  console.log(`- Settlement Items: ${result.settlementItems.length}`)
  console.log(`- Bank Transactions: ${result.bankTransactions.length}`)
  console.log(`- Ground Truth Entries: ${result.groundTruth.length}`)
}

main()
  .catch((err) => {
    console.error('Error seeding synthetic batch:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
