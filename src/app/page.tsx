'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { HeroMetrics, MetricsProps } from '@/components/HeroMetrics'
import { ControlPulse } from '@/components/ControlPulse'
import { FinanceNav } from '@/components/FinanceNav'
import { ExceptionTable, RecordItem } from '@/components/ExceptionTable'

const DEFAULT_BATCH_ID = 'batch_2026_01'

const EMPTY_METRICS: MetricsProps = {
  totalRecords: 60,
  matched: 0,
  initialExceptions: 0,
  autoResolved: 0,
  unresolved: 0,
  matchRate: '0.00',
  finalClosedRate: '0.00',
  throughput: '— rec/s',
}

type PipelineStage =
  | 'idle'
  | 'ingesting'
  | 'reconciling'
  | 'done'
  | 'error'

export default function Home() {
  const [batchId] = useState(DEFAULT_BATCH_ID)
  const [stage, setStage] = useState<PipelineStage>('idle')
  const [controlRunStarted, setControlRunStarted] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [metrics, setMetrics] = useState<MetricsProps>(EMPTY_METRICS)
  const [records, setRecords] = useState<RecordItem[]>([])
  const [selectedRecord, setSelectedRecord] =
    useState<RecordItem | null>(null)

  const loading =
    stage === 'ingesting' ||
    stage === 'reconciling'

  const fetchDashboard = useCallback(async () => {
    try {
      const [metricsResponse, exceptionsResponse] =
        await Promise.all([
          fetch(
            `/api/dashboard/metrics?batchId=${encodeURIComponent(batchId)}`
          ),
          fetch(
            `/api/dashboard/exceptions?batchId=${encodeURIComponent(
              batchId
            )}&status=all`
          ),
        ])

      if (metricsResponse.ok) {
        setMetrics(await metricsResponse.json())
      }

      if (exceptionsResponse.ok) {
        const data = await exceptionsResponse.json()
        const nextRecords: RecordItem[] = data.records ?? []

        setRecords(nextRecords)

        if (nextRecords.length > 0 && !selectedRecord) {
          setSelectedRecord(nextRecords[0])
        }
      }
    } catch (error) {
      console.error('Dashboard fetch failed:', error)
    }
  }, [batchId, selectedRecord])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const handleSelectRecord = (record: RecordItem) => {
    setSelectedRecord(record)
    window.location.href =
      `/investigation?paymentId=${encodeURIComponent(record.id)}`
  }

  const runIngest = async () => {
    setStage('ingesting')
    setStatusMessage('Preparing deterministic synthetic batch…')

    try {
      const response = await fetch('/api/pipeline/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Batch ingestion failed')
      }

      setStatusMessage('60-record batch ingested successfully.')
      await fetchDashboard()
      setStage('done')
    } catch (error) {
      setStage('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Batch ingestion failed.'
      )
    }
  }

  const runReconcile = async () => {
    setStage('reconciling')
    setStatusMessage('Running deterministic financial controls…')

    try {
      const response = await fetch('/api/pipeline/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error ?? 'Reconciliation failed')
      }

      setStatusMessage('Deterministic reconciliation completed.')
      await fetchDashboard()
      setStage('done')
    } catch (error) {
      setStage('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Reconciliation failed.'
      )
    }
  }

  const handleRunFullPipeline = async () => {
    try {
      setControlRunStarted(true)
      setStage('ingesting')
      setStatusMessage('Starting financial control loop…')

      const ingestResponse = await fetch('/api/pipeline/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      })

      const ingestData =
        await ingestResponse.json().catch(() => null)

      if (!ingestResponse.ok) {
        throw new Error(
          ingestData?.error ??
          'Batch ingestion failed. The batch may already exist.'
        )
      }

      await fetchDashboard()

      setStage('reconciling')
      setStatusMessage('Running deterministic reconciliation…')

      const reconcileResponse = await fetch(
        '/api/pipeline/reconcile',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchId }),
        }
      )

      const reconcileData =
        await reconcileResponse.json().catch(() => null)

      if (!reconcileResponse.ok) {
        throw new Error(
          reconcileData?.error ?? 'Reconciliation failed.'
        )
      }

      await fetchDashboard()

      setStage('done')
      setStatusMessage(
        'Control loop completed. Select an exception to investigate with AI.'
      )
    } catch (error) {
      setStage('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Control loop failed.'
      )
    }
  }

  const stageLabel: Record<PipelineStage, string> = {
    idle: 'READY',
    ingesting: 'INGESTING',
    reconciling: 'RECONCILING',
    done: 'OPERATIONAL',
    error: 'ACTION FAILED',
  }

  const controllerResolved = records.filter(
    (record) => record.status === 'controller_resolved'
  ).length

  const awaitingReview = records.filter(
    (record) =>
      record.status !== 'matched' &&
      record.status !== 'auto_resolved' &&
      record.status !== 'controller_resolved' &&
      record.status !== 'unresolved'
  ).length

  const humanUnresolved = records.filter(
    (record) => record.status === 'unresolved'
  ).length

  const exceptionCount = records.filter(
    (record) =>
      record.status !== 'matched' &&
      record.status !== 'auto_resolved' &&
      record.status !== 'controller_resolved'
  ).length

  return (
    <main className="min-h-screen">
      <div className="fc-shell">

        <FinanceNav
          batchId={batchId}
          stageLabel={stageLabel[stage]}
        />

        <div className="fc-system-bar">
          <div className="flex items-center gap-3">
            <span className="fc-system-mark">LA</span>
            <span className="font-semibold tracking-tight">
              LedgerAnalyser
            </span>
            <span className="fc-divider" />
            <span className="hidden sm:inline text-[10px]">
              CONTROL ROOM
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="hidden md:inline text-[color:var(--fc-text-muted)]">
              {batchId}
            </span>

            <span className="fc-live">
              <span className="fc-live-dot" />
              {stageLabel[stage]}
            </span>
          </div>
        </div>

        <section className="fc-hero">
          <div className="fc-hero-copy">
            <div className="fc-eyebrow">
              <span className="fc-eyebrow-line" />
              FINANCIAL OPERATIONS
            </div>

            <h1>
              Financial control,
              <br />
              <span>from payment to bank.</span>
            </h1>

            <p>
              Deterministic reconciliation with evidence-backed
              investigation and policy-controlled resolution.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-7">
              <button
                id="btn-full-pipeline"
                onClick={handleRunFullPipeline}
                disabled={loading}
                className="fc-primary-action"
              >
                <span>
                  {loading
                    ? 'Running control loop'
                    : 'Run full control'}
                </span>
                <span className="fc-action-arrow">→</span>
              </button>

              <div className="fc-batch-chip">
                <span className="text-[color:var(--fc-text-muted)]">
                  BATCH
                </span>
                <span>{batchId}</span>
              </div>
            </div>
          </div>

          <div className="fc-hero-panel">
            <div className="fc-panel-label">
              <span>CONTROL STATUS</span>
              <span className="font-mono">
                {stageLabel[stage]}
              </span>
            </div>

            <div className="fc-control-steps">
              <ControlStep
                number="01"
                label="INGEST"
                active={stage === 'ingesting'}
                complete={controlRunStarted && stage === 'done'}
              />

              <ControlStep
                number="02"
                label="RECONCILE"
                active={stage === 'reconciling'}
                complete={controlRunStarted && stage === 'done'}
              />

              <ControlStep
                number="03"
                label="INVESTIGATE"
                active={false}
                complete={controlRunStarted && stage === 'done'}
              />

              <ControlStep
                number="04"
                label="CONTROL"
                active={stage === 'done'}
                complete={stage === 'done'}
              />
            </div>

            <div className="fc-panel-footer">
              <span>60-record control loop</span>
              <span>PAISE · DETERMINISTIC · AUDITABLE</span>
            </div>
          </div>
        </section>

        {statusMessage && (
          <div
            className={`fc-status-banner ${stage === 'error' ? 'fc-status-error' : ''
              }`}
          >
            <span className="fc-status-pip" />
            <span>{statusMessage}</span>

            {loading && (
              <span className="fc-processing">
                PROCESSING <span>•••</span>
              </span>
            )}
          </div>
        )}

        <section className="fc-section">
          <div className="fc-section-heading">
            <div>
              <div className="fc-eyebrow">
                01 / CONTROL OVERVIEW
              </div>

              <h2>Operational snapshot</h2>
            </div>

            <div className="fc-heading-meta">
              <span>LIVE DATA</span>
              <span className="fc-meta-dot" />
              <span>
                {metrics.totalRecords || 60} RECORD TARGET
              </span>
            </div>
          </div>

          <HeroMetrics
            metrics={metrics}
            controllerResolved={controllerResolved}
            awaitingReview={awaitingReview}
          />
        </section>

        <section className="fc-section">
          <ControlPulse
            total={metrics.totalRecords}
            matched={metrics.matched}
            autoResolved={metrics.autoResolved}
            controllerResolved={controllerResolved}
            awaitingReview={awaitingReview}
            unresolved={humanUnresolved}
          />
        </section>

        <section id="exceptions" className="fc-section">
          <div className="fc-section-heading">
            <div>
              <div className="fc-eyebrow">
                02 / EXCEPTIONS
              </div>

              <h2>Resolution queue</h2>
            </div>

            <div className="fc-risk-counter">
              <span className="fc-risk-dot" />
              {exceptionCount} requiring attention
            </div>
          </div>

          <ExceptionTable
            records={records}
            selectedId={selectedRecord?.id ?? null}
            onSelectRecord={handleSelectRecord}
          />
        </section>

        <footer className="fc-footer">
          <div>
            <span className="fc-footer-brand">
              LedgerAnalyser
            </span>

            <span>
              Track 04 · Razorpay AI Buildathon 2026
            </span>
          </div>

          <div className="font-mono">
            {batchId} · {metrics.totalRecords} records ·
            Supabase / Prisma
          </div>
        </footer>
      </div>
    </main>
  )
}

function ControlStep({
  number,
  label,
  active,
  complete,
}: {
  number: string
  label: string
  active: boolean
  complete: boolean
}) {
  return (
    <div
      className={`fc-control-step ${active ? 'is-active' : ''
        } ${complete ? 'is-complete' : ''}`}
    >
      <div className="fc-step-number">
        {complete ? '✓' : number}
      </div>

      <div>
        <div className="fc-step-label">{label}</div>

        <div className="fc-step-state">
          {complete
            ? 'VERIFIED'
            : active
              ? 'RUNNING'
              : 'STANDBY'}
        </div>
      </div>
    </div>
  )
}
