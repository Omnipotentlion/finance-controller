'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { RecordItem } from '@/components/ExceptionTable'
import {
  MoneyTrailVisualizer,
  MoneyTrailProps,
} from '@/components/MoneyTrailVisualizer'
import { AIInvestigationPanel } from '@/components/AIInvestigationPanel'
import { FinanceNav } from '@/components/FinanceNav'

const BATCH_ID = 'batch_2026_01'

export function InvestigationPageContent({
  paymentId,
}: {
  paymentId: string | null
}) {
  const [record, setRecord] = useState<RecordItem | null>(null)
  const [moneyTrail, setMoneyTrail] =
    useState<MoneyTrailProps | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!paymentId) {
      setLoading(false)
      setError('No payment was selected for investigation.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const exceptionsResponse = await fetch(
        `/api/dashboard/exceptions?batchId=${encodeURIComponent(
          BATCH_ID
        )}&status=all`
      )

      if (!exceptionsResponse.ok) {
        throw new Error('Unable to load the exception queue.')
      }

      const exceptionsData = await exceptionsResponse.json()

      const found =
        (exceptionsData.records ?? []).find(
          (item: RecordItem) => item.id === paymentId
        ) ?? null

      if (!found) {
        throw new Error('The selected payment could not be found.')
      }

      setRecord(found)

      const detailResponse = await fetch(
        `/api/dashboard/records/${encodeURIComponent(paymentId)}`
      )

      if (detailResponse.ok) {
        const detailData = await detailResponse.json()

        setMoneyTrail(detailData.moneyTrail ?? null)

        // Prefer the detailed record when the API provides it,
        // so an AI investigation result appears immediately.
        if (detailData.record) {
          setRecord((current) =>
            current
              ? { ...current, ...detailData.record }
              : detailData.record
          )
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Investigation could not be loaded.'
      )
    } finally {
      setLoading(false)
    }
  }, [paymentId])

  useEffect(() => {
    load()
  }, [load])

  const refreshAfterInvestigation = async () => {
    await load()
  }

  return (
    <main className="min-h-screen">
      <div className="fc-shell">
        <FinanceNav
          batchId={BATCH_ID}
          stageLabel="INVESTIGATION"
        />

        <div className="fc-investigation-page">
          <div className="fc-page-back-row">
            <a href="/#exceptions" className="fc-back-link">
              ← Back to resolution queue
            </a>

            <span className="fc-page-context">
              EXCEPTION INVESTIGATION
            </span>
          </div>

          {loading ? (
            <div className="fc-investigation-loading">
              Loading transaction evidence…
            </div>
          ) : error ? (
            <div className="fc-investigation-error">
              <strong>Investigation unavailable</strong>
              <span>{error}</span>

              <a
                href="/#exceptions"
                className="fc-secondary-action"
              >
                Return to queue
              </a>
            </div>
          ) : record ? (
            <>
              <section className="fc-investigation-hero">
                <div>
                  <div className="fc-eyebrow">
                    01 / INVESTIGATION
                  </div>

                  <div className="fc-investigation-title-row">
                    <h1>Investigate exception</h1>

                    <span className="fc-record-chip">
                      {record.id}
                    </span>
                  </div>

                  <p>
                    Trace the financial evidence, review the AI
                    synthesis, and follow the deterministic policy
                    decision.
                  </p>
                </div>

                <div className="fc-investigation-status">
                  <span className="fc-status-label">
                    EXCEPTION
                  </span>

                  <strong>
                    {record.exceptionType ?? 'review_required'}
                  </strong>

                  <span>
                    {record.status ?? 'needs_review'}
                  </span>
                </div>
              </section>

              <section className="fc-investigation-section">
                <div className="fc-section-heading">
                  <div>
                    <div className="fc-eyebrow">
                      02 / TRACE
                    </div>

                    <h2>Transaction lifecycle</h2>
                  </div>

                  <div className="fc-heading-description">
                    Payment → settlement item → settlement →
                    bank evidence.
                  </div>
                </div>

                <div className="fc-workspace-card fc-money-card">
                  <MoneyTrailVisualizer trail={moneyTrail} />
                </div>
              </section>

              <section className="fc-investigation-section fc-ai-section">
                <div className="fc-section-heading">
                  <div>
                    <div className="fc-eyebrow">
                      03 / INVESTIGATE
                    </div>

                    <h2>Evidence & control decision</h2>
                  </div>

                  <div className="fc-heading-description">
                    AI explains the exception. Deterministic
                    controls remain authoritative.
                  </div>
                </div>

                <div className="fc-workspace-card fc-ai-card">
                  <AIInvestigationPanel
                    record={record}
                    onInvestigationComplete={
                      refreshAfterInvestigation
                    }
                  />
                </div>
              </section>
            </>
          ) : null}
        </div>

        <footer className="fc-footer">
          <div>
            <span className="fc-footer-brand">
              FINANCE CONTROLLER
            </span>

            <span>
              Investigation · Track 04 · Razorpay AI Buildathon
              2026
            </span>
          </div>

          <div className="font-mono">
            {BATCH_ID} · EVIDENCE-BACKED
          </div>
        </footer>
      </div>
    </main>
  )
}