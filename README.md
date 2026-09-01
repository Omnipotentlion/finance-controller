# LedgerAnalyser — AI-Powered Reconciliation Control Center

> **Track 04 · Razorpay AI Buildathon 2026**
>
> A multi-source financial reconciliation engine with deterministic verification, AI root-cause investigation, and bounded auto-resolution — not a Razorpay UI clone.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Supabase / Prisma Setup](#supabase--prisma-setup)
4. [Development](#development)
5. [Test Commands](#test-commands)
6. [Synthetic Batch Seed](#synthetic-batch-seed)
7. [Reconciliation & Demo Flow](#reconciliation--demo-flow)
8. [Architecture Overview](#architecture-overview)
9. [Evaluation Metrics](#evaluation-metrics)
10. [5-Minute Demo Script](#5-minute-demo-script)

---

## Prerequisites

| Tool     | Version |
|----------|---------|
| Node.js  | ≥ 20    |
| npm      | ≥ 10    |
| Supabase | Any (PostgreSQL 15+) |

---

## Environment Setup

```bash
# Copy the example env file and fill in your Supabase credentials
cp .env.example .env.local
```

Edit `.env.local`:

```
# Transaction pooler (port 6543) – used for application queries
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Direct connection (port 5432) – used for Prisma DDL (db push)
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

> **Never commit `.env.local` or `.env`.**

---

## Supabase / Prisma Setup

```bash
# Install dependencies
npm install

# Push schema to Supabase (uses DIRECT_URL — port 5432)
npx prisma db push

# Generate Prisma Client
npx prisma generate
```

Tables created:
- `Order` · `Payment` · `Settlement` · `SettlementItem` · `BankTransaction`
- `GroundTruth` *(evaluation only — never exposed via application APIs)*
- `ReconciliationResult`

---

## Development

```bash
npm run dev
```

Open **http://localhost:3000** — the LedgerAnalyser AI Control Center will load.

---

## Test Commands

Run all test suites in order:

```bash
# TypeScript type check
npx tsc --noEmit

# Milestone 1 — Synthetic Data & Ground Truth Isolation
npx tsx tests/synthetic.test.ts

# Milestone 2 — Deterministic Reconciliation Engine
npx tsx tests/reconciliation.test.ts

# Milestone 3 — End-to-End Pipeline (AI + Resolution + Evaluation)
npx tsx tests/e2e.test.ts
```

---

## Synthetic Batch Seed

The 60-record synthetic batch is deterministic (fixed-seed, fully reproducible):

```bash
# Seed batch_2026_01 directly to database
npx tsx src/scripts/seed.ts
```

Or trigger via API:

```bash
curl -X POST http://localhost:3000/api/pipeline/ingest \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01"}'
```

Ingestion is **idempotent and batch-scoped** — only clears records for the given `batchId`.

---

## Reconciliation & Demo Flow

### Via UI (recommended for demo)

1. Open **http://localhost:3000**
2. Click **⚡ Run Full Pipeline** → executes Ingest → Reconcile → Investigate in sequence
3. Watch the Control Pulse and hero metrics update live
4. Click any exception row in the Resolution Queue to inspect its Money Trail
5. The AI Investigation panel shows root-cause synthesis and guardrail decision

### Via API (step-by-step)

```bash
# Step 1: Ingest synthetic batch
curl -X POST http://localhost:3000/api/pipeline/ingest \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01"}'

# Step 2: Run deterministic reconciliation
curl -X POST http://localhost:3000/api/pipeline/reconcile \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01", "slaHours": 48}'

# Step 3: AI investigation & safe resolution
curl -X POST http://localhost:3000/api/pipeline/investigate \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01"}'

# Dashboard metrics
curl http://localhost:3000/api/dashboard/metrics?batchId=batch_2026_01

# Exception list
curl http://localhost:3000/api/dashboard/exceptions?batchId=batch_2026_01

# Individual record money trail
curl http://localhost:3000/api/dashboard/records/pay_batch_2026_01_01
```

---

## Architecture Overview

```
Synthetic Generator (deterministic, fixed-seed)
  └─ 60 records: 42 normal + 18 planted exceptions
  └─ Locked GroundTruth (evaluation-only, never in app APIs)

Deterministic Reconciliation Engine (src/lib/reconciliation/)
  ├─ Payment Linkage Check       → missing_settlement
  ├─ Duplicate Payment Check     → duplicate_payment
  ├─ Settlement Item Arithmetic  → fee_calculation_error
  ├─ Settlement Header Total     → amount_mismatch
  ├─ UTR Reference Match         → utr_mismatch
  ├─ Bank Amount Match           → amount_mismatch
  └─ Configurable SLA Timing     → timing_difference / missing_bank_credit

AI Investigation Agent (src/lib/agent/)
  ├─ Tools: getTransactionContext, getRelatedRecords, runReconciliationCheck
  ├─ Evidence synthesis per exception type
  └─ Proposes resolution to deterministic safety policy

Deterministic Resolution Policy (src/lib/resolution/)
  ├─ SAFE_POLICY_TIMING_SLA → auto_resolve
  └─ All others             → escalate to unresolved queue

Evaluation Harness (src/lib/evaluation/)
  ├─ Reads locked GroundTruth (isolated path)
  └─ Computes precision, recall, match rate — never touches AI outputs

Next.js 16 App Router
  ├─ API: /api/pipeline/{ingest,reconcile,investigate}
  ├─ API: /api/dashboard/{metrics,exceptions,records/[id]}
  └─ UI:  Single-page fintech control center
```

---

## Evaluation Metrics

Measured against the **locked, immutable GroundTruth** — never cherry-picked:

| Metric | Value |
|--------|-------|
| Total Records | 60 |
| Matched (clean) | 42 |
| Exceptions Flagged | 18 |
| **Deterministic Match Rate** | **70.00%** |
| Exception Detection Recall | **100.00%** (0 false negatives) |
| Exception Detection Precision | **83.33%** (3 FP: `missing_bank_credit` vs `timing_difference` overlap) |
| Auto-Resolved (SLA timing) | 6 |
| Escalated Unresolved | 12 |
| **Closed-Loop Rate** | **80.00%** |

**Known classification discrepancy**: 3 `missing_bank_credit` scenarios (indices 49–51) share identical settlement timestamps with 3 `timing_difference` scenarios (52–54). The engine classifies all 6 as `timing_difference` given the evaluation reference cutoff — reported honestly without altering ground truth.

---

## 5-Minute Demo Script

### 0:00–0:30 — Hook
> *"Finance teams don't just need to find mismatches. They need to know which differences are explainable, which can be safely closed, and which still need human attention."*

### 0:30–1:00 — Problem
- Show the 60 synthetic records from multiple financial sources (gateway, settlement, bank statement)

### 1:00–2:00 — Full Batch
- Click **⚡ Run Full Pipeline**
- Show: 60 records processed, 70% match rate, 18 exceptions detected
- Don't cherry-pick — the full batch result is shown

### 2:00–3:30 — AI Investigation
- Click a non-trivial exception (e.g., `amount_mismatch` or `fee_calculation_error`)
- Show the Money Trail: Payment → Settlement Item → Settlement → Bank
- Show AI root-cause synthesis and expected vs actual values
- Show the guardrail decision (escalated to human queue)

### 3:30–4:15 — Resolution
- Click an `auto_resolved` record — show the SLA guardrail approval
- Click an `unresolved` record — show why the agent stopped and escalated

### 4:15–5:00 — Evidence
- Show Control Report: 70% match rate, 80% closed-loop, 12 unresolved honest exceptions
- Show architecture diagram (in README or slide)
- Show test results: 14/14 E2E tests pass, 0 false negatives

---

## Known Limitations

1. **Timing boundary overlap**: 3 `missing_bank_credit` scenarios share timestamps with `timing_difference` scenarios, resulting in 83.33% precision (reported honestly, ground truth not modified).
2. **No LLM integration**: The AI investigation uses deterministic rule-based evidence synthesis. LLM calls (Milestone 4) are not yet implemented.
3. **Single batch at a time**: The UI is fixed to `batch_2026_01`. Multi-batch support would require a batch selector component.
4. **No authentication**: This is a buildathon prototype — no auth, no RBAC.
