# Finance Controller — AI-Powered Reconciliation Control Center

> **Track 04 · Razorpay AI Buildathon 2026**
>
> A multi-source financial reconciliation control center with deterministic verification, AI root-cause investigation, bounded auto-resolution, and human controller review — **not a Razorpay UI clone**.

---

## Table of Contents

1. [Why We Chose This Problem](#why-we-chose-this-problem)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Transaction pooler – application queries](#transaction-pooler--application-queries)
5. [Direct connection – Prisma DDL/schema operations](#direct-connection--prisma-ddlschema-operations)
6. [Gemini API key – AI investigation](#gemini-api-key--ai-investigation)
7. [Supabase / Prisma Setup](#supabase--prisma-setup)
8. [Development](#development)
9. [Test Commands](#test-commands)
10. [Synthetic Batch](#synthetic-batch)
11. [Reconciliation & Resolution Flow](#reconciliation--resolution-flow)
12. [Human Controller Review](#human-controller-review)
13. [Architecture Overview](#architecture-overview)
14. [Reconciliation Engine](#reconciliation-engine)
15. [AI Investigation & Safety](#ai-investigation--safety)
16. [Website / UI Components](#website--ui-components)
17. [Database Model](#database-model)
18. [Important Source Files](#important-source-files)
19. [Evaluation Metrics](#evaluation-metrics)
20. [Known Limitations](#known-limitations)
21. [Production Deployment](#production-deployment)
23. [Future Scope](#future-scope)
24. [Final Product Thesis](#final-product-thesis)
---

## What This Project Does

Finance Controller closes a finance-operations reconciliation loop:

```text
Ingest
  ↓
Deterministic Reconciliation
  ↓
Exception Detection
  ↓
AI Investigation
  ↓
Deterministic Safety Policy
  ├── Safe case → Auto-Resolved
  └── Unsafe / insufficient evidence → Unresolved
                                  ↓
                           Human Controller Review
                                  ↓
                    Controller Resolved / Still Unresolved
                                  ↓
                           Control Report
```

The system reconciles a complete synthetic batch representing:

```text
Payment
   ↓
Settlement Item
   ↓
Settlement
   ↓
Bank Transaction
```

The central design principle is:

> **The AI investigates and explains. Deterministic controls decide whether a financial exception can be closed.**

This prevents an LLM from becoming the source of truth for financial arithmetic or unrestricted financial decisions.

---

# Why We Chose This Problem

Track 04 is a strong fit for an AI-assisted finance system because it requires more than a chatbot: the agent must close a finance-ops loop over a **50+ record synthetic batch**, report the match rate, and honestly expose unresolved exceptions.

The project therefore focuses on:

- Full-batch processing instead of cherry-picked examples.
- Deterministic financial verification.
- AI-assisted exception investigation.
- Safe, policy-bounded auto-resolution.
- Human-in-the-loop review for unsafe cases.
- Measured accuracy against isolated ground truth.
- A visible audit/control trail.

The goal is not:

> "Let an AI decide whether the money is correct."

The goal is:

> "Use AI to reduce the investigation workload while keeping financial authority inside deterministic controls and human review."

---

# Prerequisites

| Tool | Version |
|---|---|
| Node.js | ≥ 20 |
| npm | ≥ 10 |
| Supabase | PostgreSQL 15+ |
| Git | Any recent version |

---

# Environment Setup

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Transaction pooler – application queries
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1

# Direct connection – Prisma DDL/schema operations
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# Gemini API key – AI investigation
GEMINI_API_KEY=your_gemini_api_key
```

> **Never commit `.env.local` or `.env`.**
>
> Never put database passwords or API keys in source code, screenshots, README files, or Git history.

For Vercel, configure the same variable **names and secret values** in the project's Environment Variables settings.

---

# Supabase / Prisma Setup

Install dependencies:

```bash
npm install
```

Push the Prisma schema to Supabase:

```bash
npx prisma db push
```

Generate the Prisma Client:

```bash
npx prisma generate
```

The application uses PostgreSQL through Prisma 7.

### Main logical tables

- `Order`
- `Payment`
- `Settlement`
- `SettlementItem`
- `BankTransaction`
- `GroundTruth` *(evaluation only; never exposed through application APIs)*
- `ReconciliationResult`

### Why PostgreSQL?

The problem is relational:

```text
Order
  ↓
Payment
  ↓
SettlementItem
  ↓
Settlement
  ↓
BankTransaction
```

A relational database makes these relationships, joins, identifiers and reconciliation queries explicit and auditable.

### Why Prisma?

Prisma provides:

- Typed database access from TypeScript.
- A schema that documents the relational model.
- Safer query construction.
- Generated client types.
- A clean boundary between application code and PostgreSQL.

---

# Development

Start the local development server:

```bash
npm run dev
```

Then open:

```text
https://finance-controller-sooty.vercel.app/
```

The production deployment is available at:

---

# Test Commands

Run the checks in this order:

### 1. TypeScript type check

```bash
npx tsc --noEmit
```

This checks TypeScript without generating JavaScript output.

### 2. Synthetic data + ground-truth isolation

```bash
npx tsx tests/synthetic.test.ts
```

### 3. Deterministic reconciliation

```bash
npx tsx tests/reconciliation.test.ts
```

### 4. Full end-to-end pipeline

```bash
npx tsx tests/e2e.test.ts
```

The E2E test validates the complete flow:

```text
Synthetic data
→ database
→ reconciliation
→ exception investigation
→ safety policy
→ resolution
→ evaluation
```

### Production build

```bash
npm run build
```

The production build intentionally runs:

```bash
prisma generate && next build
```

This was added because the Vercel deployment initially encountered Prisma client generation/type issues. Generating Prisma Client before the Next.js build made the production build deterministic.

---

# Synthetic Batch

The final synthetic batch contains:

```text
60 total records
├── 42 normal / clean records
└── 18 planted exceptions
```

The dataset is deterministic and reproducible.

The complete batch is processed; the system does not select only easy examples.

### Why 60?

The buildathon requires a 50+ record synthetic batch. Using 60 gives enough room for:

- Normal records.
- Multiple exception types.
- Timing scenarios.
- Amount discrepancies.
- Missing settlement/bank evidence.
- Duplicate/UTR/fee scenarios.
- Meaningful evaluation denominators.

### Ground Truth

The synthetic generator creates a locked evaluation answer key:

```text
Synthetic Generator
       ↓
Application records
       +
Locked GroundTruth
```

`GroundTruth` is isolated from normal application APIs and AI tools.

This matters because otherwise the AI could simply read the expected answer instead of investigating the evidence.

---

# Reconciliation & Resolution Flow

## Via UI

1. Open: https://finance-controller-sooty.vercel.app/
2. Click **Run Full Pipeline**.
3. The application executes:
   - Ingest
   - Reconcile
   - Investigate
4. Watch the Control Pulse and hero metrics update.
5. Open an exception from the Resolution Queue.
6. Inspect the Money Trail.
7. Run/view AI Investigation.
8. Observe the deterministic guardrail decision.
9. If required, perform Human Controller Review.
10. Open Control Report.

---

## Via API

### Step 1 — Ingest

```bash
curl -X POST http://localhost:3000/api/pipeline/ingest \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01"}'
```

### Step 2 — Deterministic reconciliation

```bash
curl -X POST http://localhost:3000/api/pipeline/reconcile \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01", "slaHours": 48}'
```

### Step 3 — AI investigation + safe resolution

```bash
curl -X POST http://localhost:3000/api/pipeline/investigate \
  -H "Content-Type: application/json" \
  -d '{"batchId": "batch_2026_01"}'
```

### Dashboard metrics

```bash
curl http://localhost:3000/api/dashboard/metrics?batchId=batch_2026_01
```

### Exception list

```bash
curl http://localhost:3000/api/dashboard/exceptions?batchId=batch_2026_01
```

### Individual money trail

```bash
curl http://localhost:3000/api/dashboard/records/pay_batch_2026_01_01
```

---

# Human Controller Review

Not every exception should be automatically closed.

The application therefore provides a separate human review layer.

For an unresolved case, the controller can:

### Resolve Case

```text
Controller decision
        ↓
CONTROLLER_RESOLVED
```

The controller must provide a rationale.

### Keep Unresolved

```text
Controller decision
        ↓
UNRESOLVED
+ Controller-reviewed rationale
```

The queue distinguishes:

| Status | Meaning |
|---|---|
| `MATCHED` | No discrepancy found; no action required. |
| `AUTO-RESOLVED` | Deterministic safety policy approved automatic closure. |
| `CONTROLLER RESOLVED` | A human controller explicitly resolved the case. |
| `UNRESOLVED` | The exception remains open. |
| `NEEDS REVIEW` / `EXCEPTION` | Controller action is required. |

The human-review API is:

```text
POST /api/pipeline/review/[paymentId]
```

This layer makes the system closer to a real finance control workflow: safe repetitive cases can be automated, while judgment-heavy cases remain explicitly owned by a human.

---

# Architecture Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js / React UI                       │
│                                                             │
│ Control Room → Resolution Queue → Investigation → Report   │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                       │
│                                                             │
│ ingest / reconcile / investigate / review                   │
│ metrics / exceptions / records                              │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
┌────────────────────────┐       ┌────────────────────────────┐
│ Prisma + PostgreSQL    │       │ Gemini Investigation Agent │
│                        │       │                            │
│ Payments               │       │ Controlled evidence tools  │
│ Settlements            │       │ Root-cause synthesis       │
│ Bank transactions      │       │ Resolution proposal        │
│ Reconciliation results │       └─────────────┬──────────────┘
└────────────┬───────────┘                     │
             │                                 ▼
             │                    ┌──────────────────────────┐
             └───────────────────►│ Deterministic Resolution │
                                  │ Policy / Guardrails       │
                                  └────────────┬─────────────┘
                                               │
                                  ┌────────────▼─────────────┐
                                  │ Human Controller Review   │
                                  └────────────┬─────────────┘
                                               ▼
                                      Control Report
```

---

# Reconciliation Engine

Located under:

```text
src/lib/reconciliation/
```

The engine performs deterministic checks.

### 1. Payment linkage

Checks whether a payment has a corresponding settlement item.

```text
Missing → missing_settlement
```

### 2. Duplicate payment

Checks for duplicate/ambiguous payment relationships.

```text
Duplicate → duplicate_payment
```

### 3. Settlement-item arithmetic

Verifies financial arithmetic such as:

```text
net = gross - fee - tax (+ adjustments where applicable)
```

Failure:

```text
fee_calculation_error
```

### 4. Settlement header total

Compares settlement-level totals with the underlying settlement items.

Failure:

```text
amount_mismatch
```

### 5. UTR reference

Compares settlement UTR with the corresponding bank transaction UTR.

Failure:

```text
utr_mismatch
```

### 6. Bank amount

Compares settlement amount with bank-side amount.

Failure:

```text
amount_mismatch
```

### 7. Timing / SLA

Checks whether a missing bank credit is still inside the configured observation window.

Possible results:

```text
timing_difference
missing_bank_credit
```

The important principle is:

> **The reconciliation engine calculates the financial facts. Gemini does not replace it.**

---

# AI Investigation & Safety

AI investigation lives under:

```text
src/lib/agent/
```

The agent uses controlled tools such as:

```text
getTransactionContext
getRelatedRecords
runReconciliationCheck
```

The investigation flow is:

```text
Exception
   ↓
Retrieve authoritative transaction evidence
   ↓
Run / inspect deterministic reconciliation result
   ↓
Gemini synthesizes root cause
   ↓
Gemini proposes a bounded resolution
   ↓
Deterministic safety policy evaluates proposal
```

## Safe resolution policy

The current safe example is:

```text
SAFE_POLICY_TIMING_SLA
```

A timing difference inside the configured SLA can be automatically resolved.

An amount mismatch cannot simply be closed because an LLM says it looks reasonable.

```text
timing_difference
        +
inside SLA
        ↓
AUTO-RESOLVED

amount_mismatch
        ↓
AUTO-RESOLVE BLOCKED
        ↓
UNRESOLVED / HUMAN REVIEW
```

This is the central safety mechanism of the product.

> **The model explains the exception. The control system decides whether money can be closed.**

---

# Website / UI Components

## Control Room

The main dashboard answers:

- How many records were processed?
- What percentage matched?
- How many exceptions exist?
- How many were auto-resolved?
- How many require attention?
- What is the current throughput?

---

## HeroMetrics

Shows the operational KPIs:

- Records Processed
- Match Rate
- Exceptions Flagged
- Auto-Resolved
- Controller / Unresolved Queue
- Throughput

The match rate is:

```text
matched / total × 100
```

For the initial batch:

```text
42 / 60 × 100 = 70.00%
```

---

## ControlPulse

Visualizes the batch state distribution:

```text
Processed
   ↓
Matched
   ↓
Auto-Resolved
   ↓
Controller Resolved / Unresolved
```

It prevents the UI from implying that every exception magically disappeared.

---

## Resolution Queue

The queue converts metrics into actions.

A controller can see which records are:

- matched,
- auto-resolved,
- controller-resolved,
- unresolved,
- awaiting review.

Selecting an exception opens its investigation page.

---

## Money Trail

The Money Trail follows:

```text
Gateway Payment
      ↓
Settlement Item
      ↓
Settlement Header
      ↓
Bank Statement
```

It displays the evidence needed to understand where reconciliation succeeded or failed.

Missing evidence is displayed explicitly rather than hidden.

---

## AI Investigation Panel

Shows:

- Exception category.
- Root cause.
- Evidence.
- Guardrail status.
- Proposed / applied resolution.
- Whether the case was auto-resolved or escalated.

The panel is intentionally not presented as an unrestricted AI decision-maker.

---

## Control Report

Provides the batch-level assurance view.

It separates:

- Auto-Resolved.
- Controller Resolved.
- Awaiting Review.
- Controller-Reviewed Unresolved.

The closed-loop view includes:

```text
Matched
+
Auto-Resolved
+
Controller Resolved
```

This gives a more meaningful operational picture than simply counting "AI resolved" records.

---

# Database Model

The logical data model is:

```text
Order
  │
  ▼
Payment
  │
  ▼
SettlementItem
  │
  ▼
Settlement
  │
  │ UTR
  ▼
BankTransaction
```

`ReconciliationResult` stores the application's reconciliation/decision state.

`GroundTruth` is isolated for evaluation only.

### Why isolate GroundTruth?

Because evaluation must answer:

> "Did the application detect the planted exception correctly?"

not:

> "Did the application read the answer key?"

The evaluation harness therefore has access to ground truth, while normal application and AI investigation paths do not.

---

# Important Source Files

```text
src/app/page.tsx
```

Main Control Room and interactive pipeline controls.

```text
src/app/layout.tsx
```

Root Next.js layout, metadata and global styling.

```text
src/app/investigation/
```

Dedicated transaction investigation page.

```text
src/app/report/
```

Batch Control Report.

```text
src/components/FinanceNav.tsx
```

Global navigation.

```text
src/components/HeroMetrics.tsx
```

Operational KPI cards.

```text
src/components/ControlPulse.tsx
```

Batch state visualization.

```text
src/components/ExceptionTable.tsx
```

Resolution queue.

```text
src/components/MoneyTrailVisualizer.tsx
```

Payment → Settlement → Bank evidence trail.

```text
src/components/AIInvestigationPanel.tsx
```

AI investigation and safety presentation.

```text
src/components/ControlReport.tsx
```

Batch-level reporting.

```text
src/lib/db.ts
```

Prisma/database client.

```text
src/lib/synthetic/
```

Deterministic synthetic generation and seeding.

```text
src/lib/reconciliation/
```

Financial reconciliation engine.

```text
src/lib/agent/
```

AI investigator and evidence tools.

```text
src/lib/resolution/
```

Deterministic resolution/safety policy.

```text
src/lib/evaluation/
```

Evaluation harness.

```text
src/app/api/pipeline/
```

Pipeline endpoints.

```text
src/app/api/dashboard/
```

Dashboard and record endpoints.

```text
src/app/api/pipeline/review/[paymentId]/
```

Human controller review endpoint.

```text
prisma/schema.prisma
```

Database schema and relationships.

```text
package.json
```

Dependencies and build commands.

---

# Evaluation Metrics

The evaluation metrics describe **specific properties of the reconciliation system**. They do **not** mean that the entire application or every AI response is "100% accurate."

This distinction is important.

### Current measured batch

| Metric | Value |
|---|---:|
| Total Records | **60** |
| Clean / Matched | **42** |
| Planted Exceptions | **18** |
| Deterministic Match Rate | **70.00%** |
| Exception Detection Recall | **100.00%** |
| Exception Detection Precision | **100.00%** |
| False Positives | **0** |
| False Negatives | **0** |
| Initial Auto-Resolved | **6** |
| Remaining / Escalated Exceptions | **12** |
| E2E Tests | **15 passed / 0 failed** |

### What precision and recall mean here

These metrics refer specifically to **exception detection against the isolated synthetic GroundTruth**.

```text
Recall
= correctly detected planted exceptions
  / all planted exceptions
```

```text
Precision
= correctly detected exceptions
  / all records flagged as exceptions
```

For the final tested batch:

```text
18 planted exceptions
18 detected
0 missed

Recall = 18 / 18 = 100%
```

and:

```text
18 true exception detections
0 false positives

Precision = 18 / 18 = 100%
```

### What this does NOT mean

It does **not** mean:

- Gemini is 100% accurate at every response.
- The UI is 100% bug-free.
- Every financial scenario in the real world is covered.
- The system is production-ready for real merchant money.
- Every AI explanation is guaranteed to be perfect.

It means:

> **On this deterministic 60-record synthetic evaluation set, the exception-detection logic matched the locked GroundTruth with 100% precision and 100% recall.**

That is the scientifically correct claim.

### Match rate vs accuracy

These are different metrics.

```text
Match Rate = 42 / 60 = 70%
```

This tells us how many records initially reconciled cleanly.

```text
Detection Recall = 100%
Detection Precision = 100%
```

These tell us how accurately the system detected the planted exceptions.

Do not describe the 70% match rate as "70% accuracy."

---

# Known Limitations

## 1. Synthetic data

The evaluation is based on a controlled synthetic dataset.

Real production data would contain:

- more transaction types,
- late-arriving records,
- partial settlements,
- refunds,
- chargebacks,
- adjustments,
- connector failures,
- duplicate events,
- schema changes,
- unexpected bank formats.

## 2. Timing boundary

Timing decisions depend on the configured SLA and observation cutoff.

The current system intentionally treats safe timing differences differently from genuine missing bank credits.

Future versions should use event-time semantics and stronger reference cutoffs to make boundary cases even more explicit.

## 3. No authentication / RBAC

This is a buildathon prototype.

A production system needs:

- Authentication.
- Role-based access control.
- Controller permissions.
- Approval policies.
- Audit logs.

## 4. AI limitations

Gemini is an investigation/explanation layer, not a mathematical source of truth.

LLM output can still be imperfect.

The architecture therefore limits the impact of an incorrect AI response through deterministic evidence and policy enforcement.

## 5. Production-scale infrastructure

The current prototype uses a straightforward Next.js + PostgreSQL architecture.

A production implementation would likely require:

- Queues/workers.
- Idempotent event processing.
- Retries.
- Rate limiting.
- Observability.
- Connector health monitoring.
- Stronger data governance.

---

# Production Deployment

The application is deployed on Vercel.

Production domain:

```text
```

Current production deployment status was verified as:

```text
Status: Ready
Environment: Production
Branch: main
```

Deployment flow:

```text
Local Project
    ↓
Git Commit
    ↓
git push origin main
    ↓
GitHub
    ↓
Vercel
    ↓
prisma generate
    ↓
next build
    ↓
Production
```

### Important deployment lesson

The project initially encountered a Vercel/Prisma build problem.

The final package build command was changed from:

```json
"build": "next build"
```

to:

```json
"build": "prisma generate && next build"
```

The local production build then completed successfully.

### Environment variables

Production secrets belong in Vercel's Environment Variables configuration.

Never commit:

```text
.env
.env.local
```

and never put:

```text
DATABASE_URL
DIRECT_URL
GEMINI_API_KEY
```

directly into source code.

---

## 0:00–0:30 — Problem

Say:

> "Finance teams have to reconcile payment, settlement and bank records. The difficult part isn't only matching numbers; when something doesn't reconcile, someone has to investigate why."

Then:

> "I built Finance Controller to close that loop."

---

## 0:30–1:00 — Full batch

Show the Control Room.

Say:

> "Instead of showing one perfect example, the system processes a complete 60-record synthetic batch."

Show:

```text
60 records
42 clean
18 exceptions
70% initial match rate
```

---

## 1:00–1:45 — Reconciliation

Run:

**Run Full Pipeline**

Explain:

```text
Ingest
→ Deterministic Reconciliation
→ Exception Detection
```

Say:

> "The financial checks are deterministic. I don't ask an LLM whether 10,000 equals 9,500."

---

## 1:45–2:30 — Exception Queue

Open the Resolution Queue.

Show different states.

Say:

> "The system doesn't hide exceptions. It tells the controller exactly which cases need attention."

---

## 2:30–3:20 — Money Trail

Open an exception.

Show:

```text
Payment
→ Settlement Item
→ Settlement
→ Bank
```

Say:

> "This is the evidence chain. The controller can see where the reconciliation broke instead of receiving a black-box AI answer."

---

## 3:20–4:10 — AI Investigation

Run/show AI Investigation.

Say:

> "Now AI becomes useful. Gemini investigates the evidence, synthesizes the likely root cause and proposes an action."

Then immediately explain:

> "But Gemini doesn't have unrestricted authority."

Show the guardrail.

---

## 4:10–4:35 — Safety + Human Review

Show a safe timing case:

```text
Timing difference
+
Inside SLA
→ AUTO-RESOLVED
```

Then show an unsafe discrepancy:

```text
Amount mismatch
→ Auto-resolution blocked
→ Human review
```

Say:

> "The model explains the exception. The control system decides whether money can be closed."

---

## 4:35–5:00 — Results

Show Control Report.

Say:

> "On the locked 60-record evaluation set, exception detection achieved 100% precision and 100% recall. Those metrics apply specifically to exception detection against GroundTruth; they do not mean the entire application or every AI response is 100% accurate."

Finish with:

> "The next step would be real payment and settlement connectors, authentication, audit trails, approval workflows and production-scale processing."

---

# Future Scope

## Real financial connectors

Replace synthetic inputs with controlled integrations.

## Continuous reconciliation

Move from a one-shot batch to continuous/hourly reconciliation.

## Production-scale processing

Introduce:

- Queues.
- Workers.
- Retries.
- Idempotency.
- Partitioning.

## RBAC

Different permissions for:

```text
Analyst
Controller
Approver
Admin
```

## Audit trail

Record:

```text
Who
What
When
Why
Evidence
Previous state
New state
```

## More finance workflows

The same architecture can extend into:

- Settlement Q&A.
- Forward cash forecasting.
- Tax-line matching.
- Refund reconciliation.
- Chargeback reconciliation.
- Fee/GST validation.
- Merchant payout monitoring.

---

# Final Product Thesis

Finance Controller is not:

```text
LLM + Financial Data = Automatic Financial Decisions
```

It is:

```text
Financial Data
      ↓
Deterministic Controls
      ↓
Exceptions
      ↓
AI Investigation
      ↓
Deterministic Safety Policy
      ↓
Safe Automation OR Human Review
      ↓
Auditable Control Report
```

The key product principle is:

> **AI reduces investigation effort; controls preserve financial accountability.**

And the key buildathon claim is:

> **We process the whole batch, measure what happened, expose what we could not safely resolve, and never use AI confidence as a substitute for financial control.**
