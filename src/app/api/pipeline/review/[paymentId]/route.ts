import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type ReviewAction = 'resolve' | 'unresolved'

export async function POST(
    request: Request,
    context: { params: Promise<{ paymentId: string }> }
) {
    try {
        const { paymentId } = await context.params
        const body = await request.json().catch(() => ({}))

        const action = body?.action as ReviewAction
        const note =
            typeof body?.note === 'string' ? body.note.trim() : ''

        if (!paymentId) {
            return NextResponse.json(
                { success: false, error: 'Payment ID is required.' },
                { status: 400 }
            )
        }

        if (action !== 'resolve' && action !== 'unresolved') {
            return NextResponse.json(
                { success: false, error: 'Invalid controller decision.' },
                { status: 400 }
            )
        }

        if (note.length < 5) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Controller rationale is required.',
                },
                { status: 400 }
            )
        }

        const existing =
            await prisma.reconciliationResult.findFirst({
                where: { record_id: paymentId },
                select: {
                    id: true,
                    status: true,
                    ai_resolution_reason: true,
                },
            })

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Reconciliation result not found.',
                },
                { status: 404 }
            )
        }

        if (
            existing.status === 'matched' ||
            existing.status === 'auto_resolved'
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'This case is already closed and cannot be controller-resolved.',
                },
                { status: 409 }
            )
        }

        const nextStatus =
            action === 'resolve'
                ? 'controller_resolved'
                : 'unresolved'

        const controllerReason =
            `CONTROLLER DECISION: ${action === 'resolve'
                ? 'RESOLVED'
                : 'KEPT UNRESOLVED'
            }. ${note}`

        await prisma.reconciliationResult.update({
            where: { id: existing.id },
            data: {
                status: nextStatus,
                ai_resolution_reason: existing.ai_resolution_reason
                    ? `${existing.ai_resolution_reason} | ${controllerReason}`
                    : controllerReason,
            },
        })

        return NextResponse.json({
            success: true,
            paymentId,
            status: nextStatus,
            controllerDecision: action,
            note,
        })
    } catch (error) {
        console.error('Controller review failed:', error)

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'Controller review failed.',
            },
            { status: 500 }
        )
    }
}
