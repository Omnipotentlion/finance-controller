import { NextRequest, NextResponse } from 'next/server'
import { investigateRecord } from '@/lib/agent/investigator'

export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ paymentId: string }> }
) {
    try {
        const { paymentId } = await params

        if (!paymentId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'paymentId is required',
                },
                { status: 400 }
            )
        }

        const investigation = await investigateRecord(paymentId)

        return NextResponse.json({
            success: true,
            investigation,
        })
    } catch (error) {
        console.error('Single-record AI investigation failed:', error)

        return NextResponse.json(
            {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : 'AI investigation failed',
            },
            { status: 500 }
        )
    }
}