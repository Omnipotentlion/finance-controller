import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const batchId = searchParams.get('batchId') ?? 'batch_2026_01'
    const statusFilter = searchParams.get('status')

    const whereClause: any = { batch_id: batchId }
    if (statusFilter && statusFilter !== 'all') {
      whereClause.status = statusFilter
    }

    const results = await prisma.reconciliationResult.findMany({
      where: whereClause,
      orderBy: { record_id: 'asc' },
    })

    const payments = await prisma.payment.findMany({
      where: { batch_id: batchId },
      include: {
        order: true,
        items: {
          include: {
            settlement: true,
          },
        },
      },
    })

    const paymentMap = new Map(payments.map((p) => [p.id, p]))

    const records = results.map((r) => {
      const p = paymentMap.get(r.record_id)
      const firstItem = p?.items[0]
      const settlement = firstItem?.settlement

      return {
        id: r.record_id,
        batchId: r.batch_id,
        recordType: r.record_type,
        status: r.status,
        exceptionType: r.exception_type,
        amount: p?.amount ?? 0,
        orderId: p?.order_id ?? null,
        settlementId: firstItem?.settlement_id ?? null,
        utr: settlement?.utr ?? null,
        createdAt: p?.created_at ?? null,
        aiExplanation: r.ai_explanation,
        aiResolutionReason: r.ai_resolution_reason,
      }
    })

    return NextResponse.json({
      batchId,
      totalCount: records.length,
      records,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch dashboard exceptions' },
      { status: 500 }
    )
  }
}
