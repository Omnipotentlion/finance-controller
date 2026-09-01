'use client'

import React from 'react'

export interface MoneyTrailProps {
  payment?: {
    id: string
    amount: number
    status: string
    orderId: string
    createdAt: string
  }

  order?: {
    id: string
    createdAt: string
  }

  settlementItems?: Array<{
    id: string
    grossAmount: number
    fee: number
    tax: number
    netAmount: number
    settlementId: string | null
  }>

  settlements?: Array<{
    id: string
    utr: string | null
    amount: number
    status: string
    createdAt?: string
    created_at?: string
  }>

  bankTransactions?: Array<{
    id: string
    utr: string | null
    amount: number
    type: string
    transactionDate?: string
    transaction_date?: string
  }>
}

function fmt(paise: number) {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
}

function formatDate(value?: string | null) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable'
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function ArrowRight() {
  return (
    <div className="hidden md:flex shrink-0 items-center justify-center px-0.5 text-[color:var(--fc-border-mid)]">
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 10h12M12 6l4 4-4 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

interface StepProps {
  step: number
  label: string
  children: React.ReactNode
  missing?: boolean
  missingLabel?: string
}

function TrailStep({
  step,
  label,
  children,
  missing,
  missingLabel,
}: StepProps) {
  return (
    <div
      data-trail-step={step}
      className={`group relative min-w-0 flex-1 basis-0 rounded-xl border p-3 transition-all duration-200 ${missing
        ? 'border-amber-500/25 bg-amber-500/[0.025]'
        : 'border-[color:var(--fc-border)] bg-[color:var(--fc-surface-2)] hover:-translate-y-0.5 hover:border-[color:var(--fc-border-mid)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.14)]'
        }`}
    >
      <div className="mb-2 flex items-center gap-1.5">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-black ${missing
            ? 'bg-amber-400/10 text-amber-300'
            : 'bg-cyan-400/8 text-cyan-300'
            }`}
        >
          {step}
        </span>

        <span className="truncate text-[8px] font-bold uppercase tracking-[0.12em] text-[color:var(--fc-text-muted)]">
          {label}
        </span>
      </div>

      {missing ? (
        <div>
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-amber-300">
            Attention
          </div>

          <p className="text-[10px] leading-relaxed text-[color:var(--fc-text-muted)]">
            {missingLabel ?? 'Record not found'}
          </p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

export function MoneyTrailVisualizer({
  trail,
}: {
  trail: MoneyTrailProps | null
}) {
  if (!trail) {
    return (
      <div className="card my-4 p-6 text-center">
        <div className="mb-1 text-sm text-[color:var(--fc-text-muted)]">
          Money Trail
        </div>

        <p className="text-xs text-[color:var(--fc-text-dim)]">
          Select a record from the Resolution Queue to inspect its
          multi-source lifecycle.
        </p>
      </div>
    )
  }

  const payment = trail.payment
  const item = trail.settlementItems?.[0]
  const settlement = trail.settlements?.[0]
  const bankTx = trail.bankTransactions?.[0]

  const settlementDate =
    settlement?.createdAt ?? settlement?.created_at

  const bankTransactionDate =
    bankTx?.transactionDate ?? bankTx?.transaction_date

  return (
    <div
      id="money-trail"
      className="card my-4 scroll-mt-24 overflow-hidden p-4 animate-slide-in"
    >
      {/* HEADER */}

      <div className="mb-3 flex items-center justify-between gap-3 border-b border-[color:var(--fc-border)] pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />

            <h3
              id="money-trail-heading"
              className="text-sm font-bold text-[color:var(--fc-text)]"
            >
              Money Trail
            </h3>
          </div>

          <p className="mt-0.5 text-[9px] text-[color:var(--fc-text-muted)]">
            Follow the transaction across every financial source.
          </p>
        </div>

        {payment && (
          <span className="max-w-[180px] shrink-0 truncate rounded-full border border-[color:var(--fc-cyan-dim)] bg-cyan-400/[0.04] px-2.5 py-1 font-mono text-[8px] text-[color:var(--fc-cyan)]">
            {payment.id}
          </span>
        )}
      </div>

      {/* TRAIL */}

      <div className="flex w-full flex-col items-stretch gap-1.5 md:flex-row">
        {/* STEP 1 */}

        <TrailStep
          step={1}
          label="Gateway Payment"
          missing={!payment}
        >
          <div className="text-lg font-extrabold leading-none text-emerald-400">
            {fmt(payment!.amount)}
          </div>

          <div className="mt-1.5 truncate font-mono text-[8px] text-[color:var(--fc-text-muted)]">
            {payment!.orderId}
          </div>

          <div className="mt-0.5 text-[8px] text-[color:var(--fc-text-dim)]">
            {formatDateTime(payment!.createdAt)}
          </div>

          <span className="mt-1.5 inline-block rounded-full px-2 py-0.5 text-[7px] font-bold uppercase tracking-wide badge-matched">
            {payment!.status}
          </span>
        </TrailStep>

        <ArrowRight />

        {/* STEP 2 */}

        <TrailStep
          step={2}
          label="Settlement Item"
          missing={!item}
          missingLabel="No settlement item linked"
        >
          {item && (
            <>
              <div className="text-lg font-extrabold leading-none text-teal-300">
                {fmt(item.netAmount)}
              </div>

              <div className="mt-1.5 font-mono text-[8px] text-[color:var(--fc-text-muted)]">
                Gross {fmt(item.grossAmount)}
              </div>

              <div className="font-mono text-[8px] text-[color:var(--fc-text-muted)]">
                Fee {fmt(item.fee)} · Tax {fmt(item.tax)}
              </div>

              <div className="mt-1 truncate font-mono text-[7px] text-[color:var(--fc-text-dim)]">
                {item.id}
              </div>
            </>
          )}
        </TrailStep>

        <ArrowRight />

        {/* STEP 3 */}

        <TrailStep
          step={3}
          label="Settlement"
          missing={!settlement}
          missingLabel="No settlement record found"
        >
          {settlement && (
            <>
              <div className="text-lg font-extrabold leading-none text-blue-400">
                {fmt(settlement.amount)}
              </div>

              <div className="mt-1.5 truncate font-mono text-[8px] text-blue-300">
                UTR: {settlement.utr ?? 'Pending'}
              </div>

              <div className="mt-0.5 text-[8px] text-[color:var(--fc-text-dim)]">
                {formatDate(settlementDate)}
              </div>

              <div className="mt-1 text-[7px] font-bold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                {settlement.status}
              </div>
            </>
          )}
        </TrailStep>

        <ArrowRight />

        {/* STEP 4 */}

        <TrailStep
          step={4}
          label="Bank Statement"
          missing={!bankTx}
          missingLabel="Bank credit not yet observed"
        >
          {bankTx && (
            <>
              <div className="text-lg font-extrabold leading-none text-indigo-300">
                {fmt(bankTx.amount)}
              </div>

              <div className="mt-1.5 truncate font-mono text-[8px] text-indigo-300">
                UTR: {bankTx.utr ?? 'Pending'}
              </div>

              <div className="mt-0.5 text-[8px] text-[color:var(--fc-text-dim)]">
                {formatDate(bankTransactionDate)}
              </div>

              <div className="mt-1 text-[7px] font-bold uppercase tracking-wide text-[color:var(--fc-text-dim)]">
                {bankTx.type}
              </div>
            </>
          )}
        </TrailStep>
      </div>

      {/* COMPACT TRAIL LEGEND */}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color:var(--fc-border)] pt-2.5 text-[7px] font-bold uppercase tracking-wider text-[color:var(--fc-text-dim)]">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Gateway
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
          Settlement
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Header
        </span>

        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
          Bank
        </span>

        <span className="ml-auto flex items-center gap-1.5 text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Missing / attention
        </span>
      </div>
    </div>
  )
}