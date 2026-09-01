'use client'

import React from 'react'

interface FinanceNavProps {
  batchId: string
  stageLabel: string
}

export function FinanceNav({
  batchId,
  stageLabel,
}: FinanceNavProps) {
  return (
    <nav className="fc-nav" aria-label="Finance Controller navigation">
      <a href="/" className="fc-nav-brand">
        <span className="fc-nav-mark">FC</span>

        <span>
          <strong>FINANCE CONTROLLER</strong>
          <small>CONTROL ROOM</small>
        </span>
      </a>

      <div className="fc-nav-links">
        <a
          href="/"
          className="fc-nav-link"
        >
          CONTROL ROOM
        </a>

        <a
          href="/#exceptions"
          className="fc-nav-link"
        >
          EXCEPTIONS
        </a>

        <a
          href="/investigation"
          className="fc-nav-link"
        >
          INVESTIGATION
        </a>

        <a
          href="/report"
          className="fc-nav-link"
        >
          CONTROL REPORT
        </a>
      </div>

      <div className="fc-nav-status">
        <span className="fc-nav-live">
          <span className="fc-live-dot" />
          {stageLabel}
        </span>

        <span className="fc-nav-batch">
          {batchId}
        </span>
      </div>
    </nav>
  )
}
