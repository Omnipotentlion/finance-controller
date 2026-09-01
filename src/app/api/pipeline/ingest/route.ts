import { NextResponse } from 'next/server'
import { generateSyntheticBatch } from '@/lib/synthetic/generator'
import { seedSyntheticBatch } from '@/lib/synthetic/seeder'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const batchId: string = body.batchId ?? 'batch_2026_01'

    // Generate deterministic batch for the given batchId,
    // then seed it (idempotent: deletes & re-creates only this batch's records)
    const batchData = generateSyntheticBatch(batchId)
    const result = await seedSyntheticBatch(batchData)

    return NextResponse.json({
      success: true,
      batchId: result.batchId,
      message: `Batch "${result.batchId}" ingested successfully (idempotent, batch-scoped).`,
      counts: {
        orders: result.orders.length,
        payments: result.payments.length,
        settlements: result.settlements.length,
        settlementItems: result.settlementItems.length,
        bankTransactions: result.bankTransactions.length,
        groundTruth: result.groundTruth.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Failed to ingest batch' },
      { status: 500 }
    )
  }
}
