import { NextResponse } from 'next/server'
import { getRelatedRecords } from '@/lib/agent/tools'
import { prisma } from '@/lib/db'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: paymentId } = await params

    const related = await getRelatedRecords(paymentId)
    if ('error' in related) {
      return NextResponse.json({ error: related.error }, { status: 404 })
    }

    const reconResult = await prisma.reconciliationResult.findFirst({
      where: { record_id: paymentId },
    })

    return NextResponse.json({
      paymentId,
      status: reconResult?.status ?? 'pending',
      exceptionType: reconResult?.exception_type ?? null,
      aiExplanation: reconResult?.ai_explanation ?? null,
      aiResolutionReason: reconResult?.ai_resolution_reason ?? null,
      moneyTrail: {
        order: related.order,
        payment: related.payment,
        settlementItems: related.settlementItems,
        settlements: related.settlements,
        bankTransactions: related.bankTransactions,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Failed to fetch record details' },
      { status: 500 }
    )
  }
}
