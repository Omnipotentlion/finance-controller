'use client'

import React from 'react'

export interface MetricsProps {
  totalRecords: number
  matched: number
  initialExceptions: number
  autoResolved: number
  unresolved: number
  matchRate: string
  finalClosedRate: string
  throughput: string
}

interface CardProps {
  label: string
  value: string | number
  sub: string
  accent: 'cyan' | 'emerald' | 'amber' | 'rose' | 'blue' | 'indigo' | 'violet'
}

const accentMap: Record<CardProps['accent'], { border: string; label: string; value: string; sub: string }> = {
  cyan: { border: 'border-[color:var(--fc-cyan-dim)]', label: 'text-[color:var(--fc-cyan)]', value: 'text-white', sub: 'text-[color:var(--fc-cyan-dim)]' },
  emerald: { border: 'border-[color:var(--fc-emerald-dim)]', label: 'text-[color:var(--fc-emerald)]', value: 'text-[color:var(--fc-emerald)]', sub: 'text-emerald-700' },
  amber: { border: 'border-[color:var(--fc-amber-dim)]', label: 'text-[color:var(--fc-amber)]', value: 'text-[color:var(--fc-amber)]', sub: 'text-amber-800' },
  rose: { border: 'border-[color:var(--fc-rose-dim)]', label: 'text-[color:var(--fc-rose)]', value: 'text-[color:var(--fc-rose)]', sub: 'text-rose-800' },
  blue: { border: 'border-[color:var(--fc-blue-dim)]', label: 'text-[color:var(--fc-blue)]', value: 'text-[color:var(--fc-blue)]', sub: 'text-blue-800' },
  indigo: { border: 'border-[color:var(--fc-indigo)]', label: 'text-[color:var(--fc-indigo)]', value: 'text-[color:var(--fc-indigo)]', sub: 'text-indigo-700' },
  violet: { border: 'border-violet-900/60', label: 'text-violet-300', value: 'text-violet-300', sub: 'text-violet-700' },
}

function MetricCard({ label, value, sub, accent }: CardProps) {
  const a = accentMap[accent]
  return (
    <div className={`card ${a.border} p-5 flex flex-col gap-1 animate-fade-in`}>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${a.label}`}>{label}</span>
      <span className={`text-3xl font-extrabold tracking-tight leading-none mt-1 ${a.value}`}>{value}</span>
      <span className={`text-[11px] mt-1 ${a.sub} opacity-80`}>{sub}</span>
    </div>
  )
}

export function HeroMetrics({
  metrics,
  controllerResolved = 0,
  awaitingReview = 0,
}: {
  metrics: MetricsProps
  controllerResolved?: number
  awaitingReview?: number
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 my-6">
      <MetricCard label="Records Processed" value={metrics.totalRecords} sub="Primary batch target" accent="cyan" />
      <MetricCard label="Match Rate" value={`${metrics.matchRate}%`} sub={`${metrics.matched} / ${metrics.totalRecords} clean`} accent="emerald" />
      <MetricCard label="Exceptions Flagged" value={metrics.initialExceptions} sub="Discrepancies detected" accent="amber" />
      <MetricCard label="Auto-Resolved" value={metrics.autoResolved} sub="Policy-approved, safe-closed" accent="blue" />
      <MetricCard label="Controller Resolved" value={controllerResolved} sub="Human decision recorded" accent="violet" />
      <MetricCard label="Awaiting Review" value={awaitingReview} sub="Controller action required" accent="rose" />
      <MetricCard label="Throughput" value={metrics.throughput} sub="Deterministic engine" accent="indigo" />
    </div>
  )
}
