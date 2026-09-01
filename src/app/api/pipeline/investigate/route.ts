import { NextRequest, NextResponse } from 'next/server'
import { investigateBatchExceptions } from '@/lib/agent/investigator'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const batchId = body?.batchId

    if (!batchId) {
      return NextResponse.json(
        {
          success: false,
          error: 'batchId is required',
        },
        { status: 400 }
      )
    }

    const investigations =
      await investigateBatchExceptions(batchId)

    const autoResolvedCount = investigations.filter(
      (i) => i.finalStatus === 'auto_resolved'
    ).length

    const unresolvedCount = investigations.filter(
      (i) => i.finalStatus === 'unresolved'
    ).length

    return NextResponse.json({
      success: true,
      batchId,
      investigations,
      autoResolvedCount,
      unresolvedCount,
    })
  } catch (error) {
    console.error(
      'Batch investigation failed:',
      error
    )

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Investigation failed',
      },
      { status: 500 }
    )
  }
}