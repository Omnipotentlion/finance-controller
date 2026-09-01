'use client'

import React from 'react'
import { RecordItem } from './ExceptionTable'

export function ControlReport({ records }: { records: RecordItem[] }) {
  const total = records.length
  const matched = records.filter((r) => r.status === 'matched').length
  const autoResolved = records.filter(
    (r) => r.status === 'auto_resolved'
  ).length
  const controllerResolved = records.filter(
    (r) => r.status === 'controller_resolved'
  ).length
  const unresolvedRecords = records.filter(
    (r) => r.status === 'unresolved'
  )
  const awaitingReviewRecords = records.filter(
    (r) =>
      r.status === 'exception' ||
      r.status === 'needs_review' ||
      r.status === 'pending'
  )

  if (total === 0) {
    return (
      <div className="card p-8 my-4 text-center">
        <div className="text-[color:var(--fc-text-muted)] text-sm mb-1">
          Control Report
        </div>
        <p className="text-[color:var(--fc-text-dim)] text-xs">
          Run the pipeline to generate the evaluation report.
        </p>
      </div>
    )
  }

  const matchRate = ((matched / total) * 100).toFixed(2)

  // A case is closed when it is cleanly matched, safely auto-resolved,
  // or explicitly resolved by a human controller.
  const closedCount =
    matched + autoResolved + controllerResolved

  const closedRate = ((closedCount / total) * 100).toFixed(2)

  const resolutionDenominator =
    autoResolved +
    controllerResolved +
    unresolvedRecords.length

  const autoResolutionRate =
    resolutionDenominator > 0
      ? ((autoResolved / resolutionDenominator) * 100).toFixed(0)
      : '—'

  return (
    <div className="card my-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 border-b border-[color:var(--fc-border)]">
        <div>
          <h3 className="text-sm font-bold text-[color:var(--fc-text)]">
            Finance Operations Control Report
          </h3>
          <p className="text-[11px] text-[color:var(--fc-text-muted)] mt-0.5">
            Full-batch metrics with denominators · Explicit human-review states
          </p>
        </div>

        <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-900/60">
          Batch: {records[0]?.batchId ?? '—'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 p-5 border-b border-[color:var(--fc-border)]">
        <ReportMetric
          label="Deterministic Match Rate"
          value={`${matchRate}%`}
          sub={`${matched} matched / ${total} total`}
          color="emerald"
        />

        <ReportMetric
          label="Closed-Loop Rate"
          value={`${closedRate}%`}
          sub={`${closedCount} closed / ${total} total`}
          color="blue"
        />

        <ReportMetric
          label="Auto-Resolution Rate"
          value={`${autoResolutionRate}%`}
          sub={`${autoResolved} auto-resolved`}
          color="cyan"
        />

        <ReportMetric
          label="Controller Resolved"
          value={controllerResolved}
          sub="Human decision recorded"
          color="violet"
        />

        <ReportMetric
          label="Awaiting Review"
          value={awaitingReviewRecords.length}
          sub="Controller action required"
          color="amber"
        />

        <ReportMetric
          label="Unresolved"
          value={unresolvedRecords.length}
          sub="Reviewed, still open"
          color="rose"
        />
      </div>

      {awaitingReviewRecords.length > 0 && (
        <div className="p-5 border-b border-[color:var(--fc-border)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h4 className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">
              Awaiting Controller Review — {awaitingReviewRecords.length} case{awaitingReviewRecords.length !== 1 ? 's' : ''}
            </h4>
          </div>

          <div className="space-y-2">
            {awaitingReviewRecords.map((r) => (
              <ReportCase key={r.id} record={r} />
            ))}
          </div>
        </div>
      )}

      {unresolvedRecords.length > 0 && (
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <h4 className="text-[11px] font-bold text-rose-300 uppercase tracking-widest">
              Controller-Reviewed Unresolved — {unresolvedRecords.length} case{unresolvedRecords.length !== 1 ? 's' : ''}
            </h4>
          </div>

          <div className="space-y-2">
            {unresolvedRecords.map((r) => (
              <ReportCase key={r.id} record={r} />
            ))}
          </div>
        </div>
      )}

      {awaitingReviewRecords.length === 0 &&
        unresolvedRecords.length === 0 &&
        total > 0 && (
          <div className="p-5 text-center">
            <span className="text-emerald-400 font-semibold text-sm">
              ✓ All exceptions resolved or auto-closed.
            </span>
          </div>
        )}
    </div>
  )
}

function ReportCase({ record }: { record: RecordItem }) {
  const controllerReviewed =
    record.status === 'unresolved' &&
    Boolean(
      record.aiResolutionReason?.includes(
        'CONTROLLER DECISION'
      )
    )

  const description =
    controllerReviewed
      ? record.aiResolutionReason?.split('|').at(-1)?.trim() ??
      'Controller reviewed the case and kept it unresolved.'
      : record.aiExplanation ??
      'Financial evidence is incomplete — controller review required.'

  return (
    <div className="card-inner p-3.5 border border-[color:var(--fc-border)]">
      <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold font-mono text-[color:var(--fc-text)]">
            {record.id}
          </span>

          {controllerReviewed && (
            <span className="text-[8px] font-mono font-bold uppercase tracking-wide text-amber-300 border border-amber-400/30 rounded px-1.5 py-0.5">
              Controller reviewed
            </span>
          )}
        </div>

        <span className="text-[10px] font-semibold font-mono text-amber-400">
          {record.exceptionType ?? 'unclassified'}
        </span>
      </div>

      <p className="text-[11px] text-[color:var(--fc-text-muted)] leading-relaxed">
        {description}
      </p>
    </div>
  )
}

function ReportMetric({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub: string
  color: 'emerald' | 'blue' | 'cyan' | 'violet' | 'amber' | 'rose'
}) {
  const colors = {
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
    cyan: 'text-[color:var(--fc-cyan)]',
    violet: 'text-violet-300',
    amber: 'text-amber-400',
    rose: 'text-rose-400',
  }

  return (
    <div className="card-inner p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--fc-text-muted)] mb-1">
        {label}
      </div>
      <div className={`text-2xl font-extrabold leading-none ${colors[color]}`}>
        {value}
      </div>
      <div className="text-[10px] text-[color:var(--fc-text-dim)] mt-1.5">
        {sub}
      </div>
    </div>
  )
}
