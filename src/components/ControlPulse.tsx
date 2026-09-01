'use client'

import React from 'react'

export function ControlPulse({
  total,
  matched,
  autoResolved,
  controllerResolved = 0,
  awaitingReview = 0,
  unresolved = 0,
}: {
  total: number
  matched: number
  autoResolved: number
  controllerResolved?: number
  awaitingReview?: number
  unresolved?: number
}) {
  const safeTotal = total || 1
  const matchedPct = (matched / safeTotal) * 100
  const autoPct = (autoResolved / safeTotal) * 100
  const controllerPct = (controllerResolved / safeTotal) * 100
  const unresolvedPct = (unresolved / safeTotal) * 100
  const awaitingPct = (awaitingReview / safeTotal) * 100

  return (
    <div className="card p-5 mb-4">
      <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
        <div>
          <h3 className="text-xs font-bold text-[color:var(--fc-text)] uppercase tracking-widest">
            Control Pulse
          </h3>
          <p className="text-[11px] text-[color:var(--fc-text-muted)] mt-0.5">
            Processed → Matched → Policy / Human control → Final state
          </p>
        </div>
        <span className="text-[10px] font-mono text-[color:var(--fc-text-muted)] bg-[color:var(--fc-surface-2)] px-3 py-1 rounded-full border border-[color:var(--fc-border)]">
          {total} records evaluated
        </span>
      </div>

      <div className="w-full bg-[color:var(--fc-surface-2)] rounded-full h-3 overflow-hidden flex border border-[color:var(--fc-border)]">
        <div style={{ width: `${matchedPct}%` }} className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full transition-all duration-700" title={`Matched: ${matched}`} />
        <div style={{ width: `${autoPct}%` }} className="bg-gradient-to-r from-blue-600 to-cyan-500 h-full transition-all duration-700" title={`Auto-Resolved: ${autoResolved}`} />
        <div style={{ width: `${controllerPct}%` }} className="bg-violet-600 h-full transition-all duration-700" title={`Controller Resolved: ${controllerResolved}`} />
        <div style={{ width: `${awaitingPct}%` }} className="bg-amber-500 h-full transition-all duration-700" title={`Awaiting Review: ${awaitingReview}`} />
        <div style={{ width: `${unresolvedPct}%` }} className="bg-rose-500 h-full transition-all duration-700" title={`Unresolved after review: ${unresolved}`} />
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4">
        <Legend dot="bg-emerald-500" label="Matched" count={matched} />
        <Legend dot="bg-blue-500" label="Auto-Resolved" count={autoResolved} />
        <Legend dot="bg-violet-500" label="Controller Resolved" count={controllerResolved} />
        <Legend dot="bg-amber-500" label="Awaiting Review" count={awaitingReview} />
        <Legend dot="bg-rose-500" label="Unresolved" count={unresolved} />
      </div>
    </div>
  )
}

function Legend({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${dot} shrink-0`} />
      <span className="text-[11px] text-[color:var(--fc-text-muted)]">{label}</span>
      <span className="text-[11px] font-semibold text-[color:var(--fc-text)]">({count})</span>
    </div>
  )
}
