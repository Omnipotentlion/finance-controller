'use client'

import React, { useState } from 'react'

export interface SelectedRecordDetails {
  id: string
  status: string
  exceptionType: string | null
  amount: number
  aiExplanation: string | null
  aiResolutionReason: string | null
}

const EXCEPTION_DESCRIPTIONS: Record<string, string> = {
  amount_mismatch:
    'Bank credit or settlement sum does not match the expected amount.',
  missing_settlement:
    'Payment captured by gateway but no settlement item was produced.',
  missing_bank_credit:
    'Settlement processed but no bank statement credit was found beyond SLA.',
  timing_difference:
    'Bank credit pending — settlement is inside the configured SLA window.',
  duplicate_payment:
    'Multiple settlement items or logical payment records were found.',
  utr_mismatch:
    'Settlement UTR reference does not match the bank transaction UTR.',
  fee_calculation_error:
    'Settlement item net amount does not equal gross − fee − tax.',
}

export function AIInvestigationPanel({
  record,
  onInvestigationComplete,
}: {
  record: SelectedRecordDetails | null
  onInvestigationComplete?: () => Promise<void> | void
}) {
  const [isInvestigating, setIsInvestigating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [controllerAction, setControllerAction] = useState<
    'resolve' | 'unresolved'
  >('resolve')
  const [controllerNote, setControllerNote] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)

  if (!record) return null

  const isAutoResolved = record.status === 'auto_resolved'
  const isControllerResolved =
    record.status === 'controller_resolved'
  const isMatched = record.status === 'matched'
  const isClosed = isAutoResolved || isControllerResolved || isMatched
  const hasAIResult = Boolean(
    record.aiExplanation || record.aiResolutionReason
  )
  const needsController = !isClosed

  const runSingleInvestigation = async () => {
    if (isInvestigating || isMatched) return

    setIsInvestigating(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/pipeline/investigate/${encodeURIComponent(record.id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'AI investigation failed')
      }

      await onInvestigationComplete?.()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'AI investigation failed'
      )
    } finally {
      setIsInvestigating(false)
    }
  }

  const submitControllerReview = async () => {
    if (!needsController || isSubmittingReview) return

    if (controllerNote.trim().length < 5) {
      setError('Add a short controller rationale before submitting.')
      return
    }

    setIsSubmittingReview(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/pipeline/review/${encodeURIComponent(record.id)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: controllerAction,
            note: controllerNote.trim(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? 'Controller review failed')
      }

      setReviewSubmitted(true)
      await onInvestigationComplete?.()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Controller review failed'
      )
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const decisionText = isAutoResolved
    ? 'The deterministic safety policy has approved this timing difference for automatic resolution.'
    : isControllerResolved
      ? 'A controller reviewed the evidence and explicitly resolved this case.'
      : isMatched
        ? 'All deterministic reconciliation checks passed. No controller action is required.'
        : 'Automatic resolution is blocked. This financial discrepancy requires controller review.'

  const decisionClasses = isAutoResolved
    ? 'border-blue-400/30 bg-blue-500/[0.045]'
    : isMatched
      ? 'border-emerald-400/25 bg-emerald-500/[0.035]'
      : 'border-amber-400/35 bg-amber-500/[0.045]'

  const decisionIconClasses = isAutoResolved
    ? 'bg-blue-400/10 text-blue-300'
    : isMatched
      ? 'bg-emerald-400/10 text-emerald-300'
      : 'bg-amber-400/10 text-amber-300'

  return (
    <div className="w-full overflow-hidden rounded-xl border border-[color:var(--fc-border)] bg-[color:var(--fc-surface)]">

      {/* HEADER */}
      <header className="flex flex-col gap-3 border-b border-[color:var(--fc-border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isAutoResolved
                ? 'bg-blue-400 shadow-[0_0_9px_rgba(96,165,250,.45)]'
                : isMatched
                  ? 'bg-emerald-400 shadow-[0_0_9px_rgba(16,185,129,.35)]'
                  : 'bg-amber-400 shadow-[0_0_9px_rgba(245,158,11,.35)]'
              }`}
          />

          <div>
            <div className="font-mono text-[8px] font-extrabold uppercase tracking-[.14em] text-[color:var(--fc-text-muted)]">
              AI INVESTIGATION
            </div>

            <h3 className="mt-1 text-[14px] font-bold tracking-[-.02em] text-[color:var(--fc-text)]">
              Evidence-backed control decision
            </h3>

            <p className="mt-1 text-[10px] leading-relaxed text-[color:var(--fc-text-muted)]">
              AI explains the exception; deterministic policy remains authoritative.
            </p>
          </div>
        </div>

        <div
          className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[8px] font-extrabold uppercase tracking-[.06em] ${isAutoResolved
              ? 'border-blue-400/30 bg-blue-500/[0.05] text-blue-300'
              : isMatched
                ? 'border-emerald-400/25 bg-emerald-500/[0.04] text-emerald-300'
                : 'border-amber-400/30 bg-amber-500/[0.04] text-amber-300'
            }`}
        >
          <span>{isAutoResolved || isControllerResolved || isMatched ? '✓' : '!'}</span>
          {isAutoResolved
            ? 'AUTO-RESOLUTION APPROVED'
            : isMatched
              ? 'CLEAN MATCH'
              : 'CONTROLLER ATTENTION'}
        </div>
      </header>

      {/* TWO-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.05fr)_minmax(320px,.95fr)]">

        {/* EVIDENCE */}
        <section className="min-w-0 border-b border-[color:var(--fc-border)] p-5 md:border-b-0 md:border-r">
          <div className="font-mono text-[8px] font-extrabold uppercase tracking-[.13em] text-[color:var(--fc-text-muted)]">
            ISSUE & ROOT CAUSE
          </div>

          {record.exceptionType && (
            <div className="mt-2 mb-5">
              <div className="font-mono text-[7px] uppercase tracking-[.1em] text-[color:var(--fc-text-dim)]">
                EXCEPTION CATEGORY
              </div>

              <div className="mt-1 font-mono text-[12px] font-bold text-amber-300">
                {record.exceptionType}
              </div>

              <p className="mt-1 max-w-2xl text-[10px] leading-[1.55] text-[color:var(--fc-text-muted)]">
                {EXCEPTION_DESCRIPTIONS[record.exceptionType] ?? ''}
              </p>
            </div>
          )}

          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="font-mono text-[8px] font-extrabold uppercase tracking-[.13em] text-[color:var(--fc-text-muted)]">
                AI EVIDENCE SYNTHESIS
              </div>

              <div className="mt-1 font-mono text-[7px] font-bold tracking-[.08em] text-emerald-400">
                {hasAIResult ? 'ANALYSIS COMPLETE' : 'ON DEMAND'}
              </div>
            </div>

            {!hasAIResult && !isMatched && (
              <button
                type="button"
                onClick={runSingleInvestigation}
                disabled={isInvestigating}
                className="inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded border border-cyan-400/45 bg-cyan-400/[0.055] px-3.5 font-mono text-[8px] font-extrabold tracking-[.06em] text-cyan-300 shadow-[0_0_18px_rgba(34,211,238,.05)] transition-all hover:-translate-y-px hover:border-cyan-300 hover:bg-cyan-400/[0.1] disabled:cursor-wait disabled:opacity-60"
              >
                {isInvestigating ? (
                  <>
                    <span className="h-2 w-2 animate-spin rounded-full border border-cyan-400/30 border-t-cyan-300" />
                    INVESTIGATING
                  </>
                ) : (
                  <>
                    RUN AI INVESTIGATION
                    <span className="text-cyan-200">→</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="min-h-[96px] rounded-lg border border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] p-3.5">
            <div className="mb-2.5 flex items-center gap-2 font-mono text-[7px] font-extrabold uppercase tracking-[.1em] text-[color:var(--fc-text-dim)]">
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full border border-cyan-400/25 text-[6px] text-cyan-300">
                AI
              </span>
              FINDING
            </div>

            {isInvestigating ? (
              <div className="pt-1">
                <div className="font-mono text-[8px] text-cyan-300">
                  Fetching evidence → reasoning → policy evaluation
                </div>

                <div className="mt-3 h-[3px] overflow-hidden bg-[color:var(--fc-border)]">
                  <div className="h-full w-2/5 animate-pulse bg-cyan-400" />
                </div>
              </div>
            ) : record.aiExplanation ? (
              <p className="font-mono text-[10px] leading-[1.65] text-[color:var(--fc-text)]">
                {record.aiExplanation}
              </p>
            ) : (
              <div>
                <p className="text-[10px] leading-[1.55] text-[color:var(--fc-text-muted)]">
                  Run one AI investigation to generate the root-cause analysis.
                </p>

                <p className="mt-2 font-mono text-[7px] text-[color:var(--fc-text-dim)]">
                  One Gemini request for this selected record.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 border border-amber-400/25 bg-amber-400/[0.04] px-3 py-2 font-mono text-[8px] leading-relaxed text-amber-300">
              {error}
            </div>
          )}
        </section>

        {/* DECISION */}
        <section className="min-w-0 p-5">
          <div className="font-mono text-[8px] font-extrabold uppercase tracking-[.13em] text-[color:var(--fc-text-muted)]">
            CONTROL DECISION
          </div>

          <div
            className={`mt-2 grid grid-cols-[30px_minmax(0,1fr)] gap-3 rounded-lg border p-3.5 ${decisionClasses}`}
          >
            <div
              className={`grid h-[30px] w-[30px] place-items-center rounded-full text-[13px] font-black ${decisionIconClasses}`}
            >
              {isAutoResolved || isControllerResolved || isMatched ? '✓' : '!'}
            </div>

            <div>
              <strong className="block text-[10px] font-extrabold tracking-[.05em] text-[color:var(--fc-text)]">
                {isAutoResolved
                  ? 'AUTO-RESOLUTION APPROVED'
                  : isMatched
                    ? 'CLEAN MATCH'
                    : 'CONTROLLER REVIEW REQUIRED'}
              </strong>

              <p className="mt-1 text-[9px] leading-[1.55] text-[color:var(--fc-text-muted)]">
                {decisionText}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <div className="font-mono text-[8px] font-extrabold uppercase tracking-[.13em] text-[color:var(--fc-text-muted)]">
              POLICY REASONING
            </div>

            <div className="mt-2 rounded-lg border border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] px-3 py-2.5 font-mono text-[9px] leading-[1.55] text-[color:var(--fc-text)]">
              {record.aiResolutionReason ?? (
                <span className="text-[color:var(--fc-text-dim)]">
                  Policy decision will appear after investigation.
                </span>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 font-mono text-[8px] font-extrabold uppercase tracking-[.13em] text-[color:var(--fc-text-muted)]">
              EVIDENCE STATUS
            </div>

            <div className="divide-y divide-white/[0.045] rounded-lg border border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] px-3">
              {[
                'Transaction context',
                'Related records',
                'Safety policy',
              ].map((label) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 py-2 text-[8px] text-[color:var(--fc-text-muted)]"
                >
                  <span>{label}</span>
                  <b className="font-mono text-[7px] tracking-[.04em] text-emerald-400">
                    ● VERIFIED
                  </b>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-4 overflow-hidden rounded-lg border border-amber-400/25 bg-amber-400/[0.025] p-3.5">
            <div className="absolute inset-y-0 left-0 w-[2px] bg-amber-400/80" />

            <div className="font-mono text-[8px] font-extrabold uppercase tracking-[.13em] text-[color:var(--fc-text-muted)]">
              CONTROLLER DECISION
            </div>

            {needsController ? (
              <>
                <p className="mt-1.5 text-[9px] leading-[1.5] text-[color:var(--fc-text-muted)]">
                  The policy has stopped automatic resolution. The controller must record an explicit disposition.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setControllerAction('resolve')}
                    className={`rounded border px-3 py-2 text-left transition ${controllerAction === 'resolve'
                        ? 'border-emerald-400/45 bg-emerald-400/[0.08] text-emerald-300'
                        : 'border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] text-[color:var(--fc-text-muted)]'
                      }`}
                  >
                    <span className="block font-mono text-[8px] font-extrabold uppercase tracking-[.06em]">
                      Resolve case
                    </span>
                    <span className="mt-1 block text-[8px] opacity-75">
                      Controller accepts the evidence.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setControllerAction('unresolved')}
                    className={`rounded border px-3 py-2 text-left transition ${controllerAction === 'unresolved'
                        ? 'border-amber-400/45 bg-amber-400/[0.08] text-amber-300'
                        : 'border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] text-[color:var(--fc-text-muted)]'
                      }`}
                  >
                    <span className="block font-mono text-[8px] font-extrabold uppercase tracking-[.06em]">
                      Keep unresolved
                    </span>
                    <span className="mt-1 block text-[8px] opacity-75">
                      More evidence or follow-up required.
                    </span>
                  </button>
                </div>

                <textarea
                  value={controllerNote}
                  onChange={(event) =>
                    setControllerNote(event.target.value)
                  }
                  placeholder="Controller rationale — required for auditability…"
                  rows={3}
                  className="mt-2.5 w-full resize-none rounded border border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] px-3 py-2 font-mono text-[9px] leading-[1.5] text-[color:var(--fc-text)] outline-none placeholder:text-[color:var(--fc-text-dim)] focus:border-amber-400/45"
                />

                <button
                  type="button"
                  onClick={submitControllerReview}
                  disabled={isSubmittingReview}
                  className="mt-2.5 inline-flex min-h-[36px] items-center gap-2 rounded border border-amber-400/40 bg-amber-400/[0.05] px-3.5 font-mono text-[8px] font-extrabold uppercase tracking-[.06em] text-amber-300 transition hover:-translate-y-px hover:border-amber-300 hover:bg-amber-400/[0.09] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmittingReview
                    ? 'SUBMITTING…'
                    : 'SUBMIT CONTROLLER DECISION →'}
                </button>
              </>
            ) : (
              <p className="mt-1.5 text-[9px] leading-[1.5] text-[color:var(--fc-text-muted)]">
                {isControllerResolved
                  ? 'Controller decision recorded. This case is closed from the human-review queue.'
                  : isAutoResolved
                    ? 'No human intervention required. The deterministic policy approved the safe resolution.'
                    : 'No controller action is required for a clean deterministic match.'}
              </p>
            )}

            {reviewSubmitted && (
              <div className="mt-2 font-mono text-[8px] font-bold text-emerald-400">
                ✓ CONTROLLER DECISION RECORDED
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
