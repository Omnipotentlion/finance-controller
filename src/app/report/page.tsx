'use client'

import React, { useEffect, useState } from 'react'
import { RecordItem } from '@/components/ExceptionTable'
import { ControlReport } from '@/components/ControlReport'
import { FinanceNav } from '@/components/FinanceNav'

const BATCH_ID = 'batch_2026_01'

export default function ControlReportPage() {
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/exceptions?batchId=${encodeURIComponent(
            BATCH_ID
          )}&status=all`
        )

        if (response.ok) {
          const data = await response.json()
          setRecords(data.records ?? [])
        }
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  return (
    <main className="min-h-screen">
      <div className="fc-shell">
        <FinanceNav
          batchId={BATCH_ID}
          stageLabel="CONTROL REPORT"
        />

        <section className="fc-report-page">
          <div className="fc-section-heading">
            <div>
              <div className="fc-eyebrow">
                03 / CONTROL REPORT
              </div>
              <h1>Batch assurance</h1>
            </div>

            <div className="fc-heading-description">
              A controller-facing summary of reconciliation,
              exceptions, resolution states, and audit evidence.
            </div>
          </div>

          {loading ? (
            <div className="fc-investigation-loading">
              Loading control report…
            </div>
          ) : (
            <ControlReport records={records} />
          )}
        </section>

        <footer className="fc-footer">
          <div>
            <span className="fc-footer-brand">
              FINANCE CONTROLLER
            </span>
            <span>
              Control Report · Track 04 · Razorpay AI Buildathon
              2026
            </span>
          </div>

          <div className="font-mono">
            {BATCH_ID} · AUDIT SUMMARY
          </div>
        </footer>
      </div>
    </main>
  )
}
