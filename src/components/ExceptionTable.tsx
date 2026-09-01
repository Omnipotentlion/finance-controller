'use client'

import React from 'react'

export interface RecordItem {
  id: string
  batchId: string
  recordType: string
  status: string
  exceptionType: string | null
  amount: number
  orderId: string | null
  settlementId: string | null
  utr: string | null
  createdAt: string | null
  aiExplanation: string | null
  aiResolutionReason: string | null
}

function formatINR(paise: number) {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}

const STATUS_CONFIG: Record<string, { label: string; sublabel: string; className: string }> = {
  matched: { label: 'MATCHED', sublabel: 'No action required', className: 'badge-matched' },
  auto_resolved: { label: 'AUTO-RESOLVED', sublabel: 'Policy approved', className: 'badge-resolved' },
  controller_resolved: { label: 'CONTROLLER RESOLVED', sublabel: 'Human decision', className: 'badge-resolved' },
  unresolved: { label: 'UNRESOLVED', sublabel: 'Awaiting follow-up', className: 'badge-unresolved' },
  exception: { label: 'EXCEPTION', sublabel: 'Awaiting review', className: 'badge-unresolved' },
  needs_review: { label: 'NEEDS REVIEW', sublabel: 'Controller action required', className: 'badge-pending' },
  pending: { label: 'PENDING', sublabel: 'Awaiting processing', className: 'badge-pending' },
}

const EXCEPTION_COLORS: Record<string, string> = {
  amount_mismatch: 'text-amber-400',
  missing_settlement: 'text-rose-400',
  missing_bank_credit: 'text-rose-300',
  timing_difference: 'text-yellow-400',
  duplicate_payment: 'text-orange-400',
  utr_mismatch: 'text-purple-400',
  fee_calculation_error: 'text-red-400',
}

export function ExceptionTable({
  records,
  selectedId,
  onSelectRecord,
}: {
  records: RecordItem[]
  selectedId: string | null
  onSelectRecord: (record: RecordItem) => void
}) {
  const [activeTab, setActiveTab] = React.useState<'all' | 'matched' | 'auto_resolved' | 'exceptions'>('all')
  const [search, setSearch] = React.useState('')

  const filteredRecords = records.filter((r) => {
    if (activeTab === 'matched' && r.status !== 'matched') return false
    if (
      activeTab === 'auto_resolved' &&
      r.status !== 'auto_resolved' &&
      r.status !== 'controller_resolved'
    ) return false
    if (
      activeTab === 'exceptions' &&
      (r.status === 'matched' ||
        r.status === 'auto_resolved' ||
        r.status === 'controller_resolved')
    ) return false

    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        r.id.toLowerCase().includes(q) ||
        (r.exceptionType ?? '').toLowerCase().includes(q) ||
        (r.utr ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const counts = {
    all: records.length,
    matched: records.filter((r) => r.status === 'matched').length,
    auto_resolved: records.filter(
      (r) => r.status === 'auto_resolved' || r.status === 'controller_resolved'
    ).length,
    exceptions: records.filter(
      (r) =>
        r.status !== 'matched' &&
        r.status !== 'auto_resolved' &&
        r.status !== 'controller_resolved'
    ).length,
  }

  const tabs: Array<{ key: typeof activeTab; label: string; count: number }> = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'matched', label: 'Matched', count: counts.matched },
    { key: 'auto_resolved', label: 'Resolved', count: counts.auto_resolved },
    { key: 'exceptions', label: 'Exceptions', count: counts.exceptions },
  ]

  return (
    <div className="card my-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-5 border-b border-[color:var(--fc-border)]">
        <div>
          <h3 className="text-sm font-bold text-[color:var(--fc-text)]">Resolution Queue</h3>
          <p className="text-[11px] text-[color:var(--fc-text-muted)] mt-0.5">
            Click any row to inspect the full money trail and AI investigation.
          </p>
        </div>

        <div className="flex bg-[color:var(--fc-surface-2)] p-1 rounded-lg border border-[color:var(--fc-border)] gap-0.5 text-[11px] font-semibold flex-wrap">
          {tabs.map(({ key, label, count }) => {
            const active = activeTab === key
            let activeCls = 'bg-[color:var(--fc-surface)] text-[color:var(--fc-text)]'
            if (key === 'matched' && active) activeCls = 'bg-emerald-950 text-emerald-300'
            if (key === 'auto_resolved' && active) activeCls = 'bg-blue-950 text-blue-300'
            if (key === 'exceptions' && active) activeCls = 'bg-amber-950/60 text-amber-300'

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-md transition-all ${active
                    ? activeCls
                    : 'text-[color:var(--fc-text-muted)] hover:text-[color:var(--fc-text)]'
                  }`}
              >
                {label}
                <span className={`ml-1.5 ${active ? 'opacity-100' : 'opacity-60'}`}>
                  ({count})
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-5 pt-4 pb-2">
        <input
          type="text"
          placeholder="Filter by Payment ID, exception type, or UTR…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[color:var(--fc-surface-2)] border border-[color:var(--fc-border)] rounded-lg px-4 py-2.5 text-[12px] font-mono text-[color:var(--fc-text)] placeholder-[color:var(--fc-text-muted)] focus:outline-none focus:border-[color:var(--fc-cyan-dim)] transition-colors"
        />
      </div>

      {filteredRecords.length === 0 && (
        <div className="px-5 py-12 text-center text-[color:var(--fc-text-muted)] text-sm">
          {records.length === 0
            ? 'No records yet. Run the pipeline to ingest and process the batch.'
            : 'No records match the current filter.'}
        </div>
      )}

      {filteredRecords.length > 0 && (
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="text-left">Payment ID</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th>Exception Category</th>
                <th className="hidden md:table-cell">UTR</th>
                <th className="text-center">Inspect</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((r, i) => {
                const isSelected = r.id === selectedId
                const sc = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending
                const excColor = r.exceptionType
                  ? EXCEPTION_COLORS[r.exceptionType] ?? 'text-slate-400'
                  : ''

                const hasControllerReview =
                  r.status === 'unresolved' &&
                  Boolean(r.aiResolutionReason?.includes('CONTROLLER DECISION'))

                const statusSubLabel =
                  hasControllerReview
                    ? 'Controller reviewed'
                    : sc.sublabel

                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRecord(r)}
                    className={`cursor-pointer transition-colors duration-100 ${isSelected
                        ? 'bg-[rgba(34,211,238,0.06)] border-l-2 border-l-[color:var(--fc-cyan)]'
                        : 'hover:bg-[color:var(--fc-surface-2)]'
                      }`}
                    style={{ animationDelay: `${i * 15}ms` }}
                  >
                    <td className="font-mono text-[11px] text-[color:var(--fc-text)] font-semibold max-w-[200px] truncate">
                      {r.id}
                    </td>

                    <td className="text-right font-mono text-[12px] font-bold text-[color:var(--fc-text)]">
                      {formatINR(r.amount)}
                    </td>

                    <td className="text-center">
                      <div className="inline-flex min-w-[116px] flex-col items-center gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${sc.className}`}>
                          {sc.label}
                        </span>
                        <span className="text-[8px] leading-none text-[color:var(--fc-text-dim)]">
                          {statusSubLabel}
                        </span>
                      </div>
                    </td>

                    <td>
                      {r.exceptionType ? (
                        <span className={`text-[11px] font-semibold font-mono ${excColor}`}>
                          {r.exceptionType}
                        </span>
                      ) : (
                        <span className="text-[color:var(--fc-text-dim)] text-[11px]">—</span>
                      )}
                    </td>

                    <td className="hidden md:table-cell font-mono text-[10px] text-[color:var(--fc-text-muted)] max-w-[160px] truncate">
                      {r.utr ?? '—'}
                    </td>

                    <td className="text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectRecord(r)
                        }}
                        className="text-[11px] font-semibold text-[color:var(--fc-cyan)] hover:text-white transition-colors"
                      >
                        Trail →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 border-t border-[color:var(--fc-border)] text-[10px] text-[color:var(--fc-text-muted)] flex justify-between">
        <span>Showing {filteredRecords.length} of {records.length} records</span>
        {counts.exceptions > 0 && (
          <span className="text-amber-300 font-semibold">
            {counts.exceptions} exception{counts.exceptions !== 1 ? 's' : ''} require attention
          </span>
        )}
      </div>
    </div>
  )
}
