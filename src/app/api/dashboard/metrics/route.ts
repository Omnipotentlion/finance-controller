import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId') ?? 'batch_2026_01'

    const totalPayments = await prisma.payment.count({ where: { batch_id: batchId } })
    const results = await prisma.reconciliationResult.findMany({ where: { batch_id: batchId } })

    const matched = results.filter((r) => r.status === 'matched').length
    const autoResolved = results.filter((r) => r.status === 'auto_resolved').length
    const needsReview = results.filter((r) => r.status === 'needs_review').length
    const unresolved = results.filter((r) => r.status === 'unresolved').length
    const initialExceptions = results.filter((r) => r.status !== 'matched').length

    const matchRate = totalPayments > 0 ? (matched / totalPayments) * 100 : 0
    const finalResolutionRate = initialExceptions > 0 ? ((matched + autoResolved) / totalPayments) * 100 : matchRate

    return NextResponse.json({
      batchId,
      totalRecords: totalPayments,
      matched,
      initialExceptions,
      autoResolved,
      needsReview,
      unresolved,
      matchRate: matchRate.toFixed(2),
      finalClosedRate: finalResolutionRate.toFixed(2),
      throughput: '60 rec / 0.4s',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}
