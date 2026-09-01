import { NextResponse } from 'next/server'
import { runBatchReconciliation } from '@/lib/reconciliation/service'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const batchId = body.batchId ?? 'batch_2026_01'

    const startTime = Date.now()
    const summary = await runBatchReconciliation(batchId, {
      slaHours: body.slaHours ?? 48,
    })
    const elapsedMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      batchId: summary.batchId,
      totalRecords: summary.totalRecords,
      matchedCount: summary.matchedCount,
      exceptionCount: summary.exceptionCount,
      matchRate: ((summary.matchedCount / summary.totalRecords) * 100).toFixed(2),
      elapsedMs,
      throughputRecordsPerSec: Math.round((summary.totalRecords / (elapsedMs / 1000 || 1)) * 10) / 10,
    })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message ?? 'Failed to run batch reconciliation' },
      { status: 500 }
    )
  }
}
